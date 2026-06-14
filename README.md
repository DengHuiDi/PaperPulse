# 欢迎来到 PaperPulse 👋

把英文论文自动解析为「**核心主张 + 5 段 × N 张语义批注卡**」双栏对照视图，
覆盖 摘要 → 引言 → 方法 → 实验 → 结论。

> **✨ 看看现在长啥样**

打开 [演示](https://yourname.github.io/paperpulse) （或本地运行）→ 点"演示模式" → 一篇 SOD-YOLOv10 论文的离线批注立刻出现。

## 🚀 30 秒上手

```bash
git clone https://github.com/yourname/paperpulse.git
cd paperpulse
npm install
cp env.local.example .env.local
# 在 .env.local 填入 MOONSHOT_API_KEY
npm run dev
```

打开 `http://localhost:3000` → 点"演示模式"（无需 API Key 即可看效果）→ 或点"上传 PDF"用真实 AI 分析。

## ✨ 核心特性

- **流式 SSE 输出**：AI 分析过程实时推送，5 段批注逐步点亮
- **多 Agent 编排**：Splitter → Section Analysts × N → Aggregator 三级流水线
- **5 种语义高亮** + 4 种徽章：核心论点 / 关键概念 / 实证证据 / 让步反驳 / 方法论
- **失败自愈**：LLM 输出瑕疵自动降级而非崩溃
- **Zod 严格 schema**：前后端共享类型，零类型漂移
- **3 种入口**：PDF 上传 / 文本粘贴 / 离线演示

## 🧠 技术路线

### 1. 编排层 — 多 Agent 流水线

```
Orchestrator (3 阶段)
  │
  ├─ Stage 1: Splitter          ← LLM 切分 5–8 个章节
  │   input:  整篇论文纯文本
  │   output: { sectionId, sectionTitle, contentRange }[]
  │
  ├─ Stage 2: Section Analysts × N  ← 3 路并发（bounded queue）
  │   input:  单个章节文本
  │   output: AnnotationCard[] (5 种类型, 4 种徽章)
  │
  └─ Stage 3: Aggregator        ← 跨章节归纳
      input:  全部 AnnotationCard
      output: { strengths[], weaknesses[], keyInsights[] }
```

每阶段独立 schema、独立 prompt、独立超时，单阶段失败不污染整体。

### 2. Prompt 工程 — 三明治结构

```
┌─ schema 头 ─────────────────────┐
│ 输出 JSON，字段：type, title... │  ← 告诉模型"格式"
├─ 枚举图例 ─────────────────────┤
│ type ∈ {thesis, concept, ...}  │  ← 把模糊词变成可枚举值
├─ few-shot 1 ──────────────────┤
│ input → output 完整示例         │  ← 给 2 个正例
├─ few-shot 2 ──────────────────┤
│ input → output 完整示例         │
├─ 当前任务 ─────────────────────┤
│ 章节文本: ...                  │  ← 当前请求
└──────────────────────────────┘
```

所有 prompt 集中在 [`lib/prompts.ts`](./lib/prompts.ts)，便于版本管理。

### 3. 容错体系 — 三层防御

| 层 | 文件 | 作用 |
|---|---|---|
| 重试层 | `lib/llm.ts` | 指数退避，max 3 次 |
| 解析层 | `lib/agents/sanitize.ts` | Zod 失败 → 降级而非崩溃 |
| 业务层 | `lib/agents/orchestrator.ts` | 单 Agent 失败 → 跳过该节继续 |

### 4. 流式响应 — Server-Sent Events

服务端推送 5 类事件：

```
meta            → { totalStages, model, estimatedTokens }
stage           → { stage: 'split' | 'analyze' | 'aggregate', status }
section/parsed  → { sections: [...] }
section/analyzed→ { sectionId, cards: [...] }
result          → { summary: { strengths, weaknesses } }
done            → null
error           → { stage, message }
```

前端 [`useStreamAnalyze`](./lib/hooks/useStreamAnalyze.ts) 订阅，**首屏 3s 可读**。

### 5. 类型安全 — 端到端 Zod

```
lib/schemas.ts  ←  唯一真相源
      ↓
LLM Prompt       ←  编译时拼装（schema 头 + 枚举图例）
      ↓
LLM Output       ←  schema.parse() 严格校验
      ↓
React State      ←  z.infer 自动推导类型，零手动 interface
```

改 schema → 前后端编译同时报错，**零类型漂移**。

## 📁 仓库导航

| 你想找什么 | 去看 |
|---|---|
| 改首页 UI | `app/page.tsx` + `components/` |
| 改批注卡样式 | `components/AnnotationCard.tsx` |
| 调整 AI Prompt | `lib/prompts.ts` |
| 改 schema（增减批注类型） | `lib/schemas.ts` |
| 加新 Agent 角色 | `lib/agents/<role>.ts` |
| 调试 SSE 流 | `lib/hooks/useStreamAnalyze.ts` + `app/api/analyze/route.ts` |
| 看迭代历史 | [CHANGELOG.md](./CHANGELOG.md) |
| 想贡献代码 | [CONTRIBUTING.md](./CONTRIBUTING.md) |

## 🗺 路线图

- [x] **Phase 1** — SSE 流式 + Zod schema + 模块化 Prompt + PDF 解析
- [x] **Phase 2** — 多 Agent 编排 + 跨章节归纳
- [x] **Phase 2.5** — 整体视觉升级（玻璃 TopNav / 渐变 Hero / 论证流图）
- [ ] **Phase 3** — 原文-批注双向联动 + 引用溯源
- [ ] **Phase 4** — Eval 集 + 可观测 + 缓存
- [ ] **Phase 5** — 多论文横向对比 + 报告导出

## 📄 协议

MIT — 详见 [LICENSE](./LICENSE)

---

Made with ❤️ for researchers who want to read faster.
