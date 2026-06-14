# Changelog

PaperPulse 的所有重要变更都会记录在此文件。格式遵循 [Keep a Changelog](https://keepachangelog.com/)，
版本号遵循 [Semantic Versioning](https://semver.org/)。

## [Unreleased]

### Changed
- 整体视觉升级：玻璃 TopNav、渐变 Hero、双栏布局、6 阶段论证流图
- 5 种批注类型 emoji 图标 + 渐变边色 + 折叠展开
- SectionNav 横滚 chip + 自动居中 + 渐变进度条
- 批注卡左侧渐变边色 + slide-up 动画

### Added
- `lib/agents/sanitize.ts` — LLM 输出容错层（缺失字段、错值自动降级）
- `components/AgentPipeline.tsx` — 多阶段流水线可视化
- `components/TokenUsagePanel.tsx` — Token 用量实时展示

## [0.2.0] - 2026-06-14

### Added
- Phase 2：多 Agent 编排（Splitter → Section Analysts × N → Aggregator）
- 3 阶段并发执行（MAX_PARALLEL=3，bounded queue）
- 失败自动降级：单章节失败不影响整体返回
- 跨章节 Strengths / Weaknesses 归纳

## [0.1.0] - 2026-06-14

### Added
- Phase 1：SSE 流式输出 + Zod 严格 schema 校验
- 模块化 Prompt 工程（schema 头 + 枚举图例 + few-shot）
- 5 种语义高亮 + 4 种徽章
- PDF 上传解析 + 文本粘贴 + 演示模式（3 种入口）
- 重试机制（指数退避，最多 3 次）

[Unreleased]: https://github.com/yourname/paperpulse/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/yourname/paperpulse/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/yourname/paperpulse/releases/tag/v0.1.0
