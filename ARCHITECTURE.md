# Architecture

> PaperPulse 的内部架构说明。改代码前请先看这里。

## 🧭 全局

```
┌──────────────────────────────────────────────────────────────┐
│  Browser  (React 19, Next.js 16 App Router)                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  app/page.tsx — 主页（3 模式 + 状态机）                │  │
│  │    ├─ TopNav     (玻璃吸顶 + 论文元信息)              │  │
│  │    ├─ SectionNav (横滚 chip + 进度条)                 │  │
│  │    ├─ AnnotationRenderer                              │  │
│  │    │    ├─ Hero 摘要区 (5 类型分布)                   │  │
│  │    │    ├─ 双栏布局 (左=当前节+跳章, 右=批注流)       │  │
│  │    │    └─ AnnotationCard (5 类型 × 4 徽章)            │  │
│  │    └─ ArgumentOverview (6 阶段论证流图 + 指标)         │  │
│  └────────────────────────────────────────────────────────┘  │
│        ↕ fetch + ReadableStream (SSE)                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  app/api/analyze/route.ts — 流式编排器                │  │
│  │    └─ lib/agents/orchestrator.ts                       │  │
│  │         ├─ Stage 1: splitter                          │  │
│  │         ├─ Stage 2: sectionAnalyst × N (parallel 3)   │  │
│  │         └─ Stage 3: aggregator                        │  │
│  └────────────────────────────────────────────────────────┘  │
│        ↕ HTTPS                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Moonshot Kimi (moonshot-v1-128k)                     │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## 📂 目录哲学

| 目录 | 放什么 | 不放什么 |
|---|---|---|
| `app/` | Next.js 路由 + 服务端 API | 业务逻辑（应放到 `lib/`） |
| `components/` | 纯展示组件（无业务逻辑） | 数据获取、状态机 |
| `lib/agents/` | 单个 Agent 角色 | 多角色编排（应放到 `orchestrator.ts`） |
| `lib/hooks/` | React Hook | 普通工具函数（应放到 `lib/`） |
| `lib/schemas.ts` | 所有 Zod schema | 业务规则 |
| `lib/prompts.ts` | 所有 LLM prompt 文本 | 调用逻辑（应放到 `llm.ts`） |

## 🔄 数据流

### 1. 用户上传 PDF

```
[File Input] 
  → fetch('/api/parse-pdf', { formData })
  → app/api/parse-pdf/route.ts  (pdf-parse)
  → 返回纯文本
  → useStreamAnalyze(text)
```

### 2. SSE 流式分析

```
Client: fetch('/api/analyze', { body: { text, mode: 'multi-agent' }})
  ↓
Server (Next.js Edge/Node runtime):
  ├─ orchestrator.start(text)
  │   ├─ emit({type:'meta', totalStages, model, ...})
  │   ├─ splitter.analyze(text) → emit({type:'stage', stage:'split', status:'start'})
  │   │                          → emit({type:'section/parsed', sections:[...]})
  │   │                          → emit({type:'stage', status:'end', elapsedMs})
  │   ├─ sectionAnalyst.run(sections)  (3 并发, bounded queue)
  │   │   → emit({type:'section/analyzed', sectionId, cards})
  │   ├─ aggregator.run(allCards) → emit({type:'result', summary})
  │   └─ emit({type:'done'})
  ↓
Client (useStreamAnalyze):
  onMeta / onSectionParsed / onSectionAnalyzed / onResult
  → 更新 React state
  → 批注卡逐步点亮
```

### 3. 失败降级

```
每个 Agent 内部：
  try {
    parsed = schema.parse(JSON.parse(llmOutput))
  } catch {
    parsed = sanitize(rawText)   // 容忍缺失字段、错值
  }
  // 不抛出错误，输出"局部可用的最佳结果"
```

## 🧠 关键设计决策

### 1. 为什么不直接 streaming 返回 Markdown？

Markdown 解析到 React 状态需要二次结构化，且无法做强类型校验。
我们让 LLM **输出 JSON**，前端按 schema 渲染——多花 1–2s 解析时间，换来**确定性渲染**和**类型安全**。

### 2. 为什么不引入 LangChain？

编排很轻（3 阶段），自己写 200 行比 LangChain 抽象更可控。
但我们保留了 `lib/llm.ts` 抽象层，未来想换框架不疼。

### 3. 为什么没用数据库？

V0 阶段：
- 输入是 PDF 文本
- 输出是 in-memory JSON
- 重新分析成本 < 1 元

V1+ 可加 SQLite / Postgres 缓存分析结果。

### 4. 为什么演示模式 (`demoData.ts`) 也用同一份 schema？

保证演示和生产**渲染完全一致**——任何 schema 改动，演示必须跟着改，
不会出现"演示看起来漂亮，真实结果漏字段"的尴尬。

## 🔌 扩展点

| 想加什么 | 改哪里 |
|---|---|
| 新增批注类型（如"局限"） | `lib/schemas.ts` + `lib/prompts.ts` + `components/AnnotationCard.tsx` (TYPE_META) |
| 接入新模型（GPT-4 / Claude） | `lib/llm.ts` 加 provider |
| 改并发上限 | `lib/agents/orchestrator.ts` MAX_PARALLEL |
| 改 Token 预算 | `lib/llm.ts` max_tokens |
| 新增缓存层 | 在 `app/api/analyze/route.ts` 入口加 hash 命中 |
| 新增导出（PDF / Markdown） | 在 `app/page.tsx` 加按钮，调用新 API |

## 🧪 调试技巧

```bash
# 看 SSE 流
curl -N -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"<论文文本>","mode":"multi-agent"}'

# 单 Agent 模式（不走 orchestrator，直接一个 LLM 跑完）
curl -N -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"<论文文本>","mode":"single"}'
```

打开浏览器 DevTools → Network → 找到 `analyze` 请求 → 看 EventStream。
