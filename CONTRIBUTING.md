# Contributing to PaperPulse

感谢你有兴趣贡献！请阅读以下指南，让协作更顺畅。

## 🛠 开发环境

- Node.js ≥ 20
- pnpm（推荐）或 npm / yarn
- 一个 Moonshot API Key（用于 live 模式）

```bash
pnpm install
cp env.local.example .env.local
# 填入 MOONSHOT_API_KEY
pnpm dev
```

## 🧱 目录约定

```
app/              Next.js App Router 入口
  api/            服务端 API（无状态）
  page.tsx        主页（client）
components/       客户端 React 组件（无业务逻辑，纯展示）
lib/
  agents/         Agent 实现（每文件一个角色）
  hooks/          React Hook
  schemas.ts      前后端共享 Zod schema
  prompts.ts      集中式 Prompt（所有版本在此）
  llm.ts          LLM 调用封装（重试、超时）
  demoData.ts     演示数据（与生产 schema 严格对齐）
```

**新功能归位**：
- 新的批注维度 → `lib/schemas.ts`（先扩 schema）+ `lib/prompts.ts`（扩 prompt）
- 新的 Agent 角色 → `lib/agents/<role>.ts`
- 新的可视化组件 → `components/`
- 新的 API 端点 → `app/api/<endpoint>/route.ts`

## ✍️ Commit 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat: 新增批注卡"原文-批注"双栏对照
fix: aggregator 在空 sections 时崩溃
docs: 更新 CHANGELOG v0.3.0
refactor: 抽取 useStreamAnalyze 到独立 Hook
style: 批注卡 hover 动画优化
chore: 升级 next 到 16.1
```

## 🔀 分支策略

- `main` — 稳定分支，受保护，每个 commit 都对应一个发布版本
- `feat/*` — 新功能分支，PR 合入 main
- `fix/*` — 紧急修复分支
- `release/vX.Y.Z` — 发布准备分支

## ✅ PR 流程

1. Fork → 创建分支（`feat/xxx` 或 `fix/xxx`）
2. 提交代码（按 Conventional Commits）
3. 写明"变更说明 + 截图（UI 类）"
4. 在 `.github/PULL_REQUEST_TEMPLATE.md` 中勾选 checklist
5. 等 CI 通过 + 1 个 reviewer approve

## 🧪 测试

- LLM 输出：手动用 `lib/demoData.ts` 的"演示模式"自检
- API：用 `curl` + `curl -N http://localhost:3000/api/analyze` 看 SSE 流
- 端到端：在首页点 3 个入口都跑一遍

（自动化测试暂未引入——LLM 输出不稳定，单元测试性价比低，待 Phase 4 Eval 集再补）

## 📦 发布

```bash
# 1. 更新版本号
npm version patch  # 0.2.0 → 0.2.1
npm version minor  # 0.2.0 → 0.3.0

# 2. 更新 CHANGELOG.md（把 [Unreleased] 改为 [X.Y.Z] - <日期>）

# 3. 提交
git add -A
git commit -m "chore(release): v0.3.0"

# 4. 打 tag
git tag -a v0.3.0 -m "v0.3.0"
git push origin main --tags
```

## 💬 行为准则

请保持友善与建设性。我们接受所有"对项目有正向价值"的 PR。
