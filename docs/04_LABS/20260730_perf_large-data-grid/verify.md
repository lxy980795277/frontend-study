# Large Data Grid Verification

## 环境

- 日期：2026-07-31
- 分支：`feat/large-data-grid`
- 浏览器：Playwright Chromium
- 默认数据：1,000,000 行 × 100 列，共 100,000,000 个逻辑单元格
- 本地运行时：Node.js 24.11.0、pnpm 11.16.0

## 主路径

- `/labs` 可以进入独立的 `/labs/large-data-grid` 页面。
- 页面默认建立 1,000,000 × 100 的 Worker Offscreen 工作台，不在主线程物化完整单元格矩阵。
- 顶部操作栏保持紧凑，Grid 自动占满页面剩余高度，数据滚动限制在 Grid 内部。
- DOM Virtual、Main Canvas 与 Worker Offscreen 使用相同数据源、几何、格式化与逻辑状态。
- DOM Virtual 的表头、可见行和 Cell 使用纯 HTML `div` 双向虚拟化；SVG 只保留给有界交互 Overlay。
- 点击、键盘导航、范围选择、列宽调整、行跳转、排序、过滤和受限 TSV 复制可正常工作。
- 隔离 Benchmark 按计划逐个挂载 Renderer，报告保留逐轮结果、实际 Renderer 和一致性摘要。

## 异常路径

- Worker 故障后释放失效实例并降级到 Main Canvas，Grid 继续可用且界面展示降级原因。
- 超出复制安全上限时阻止大规模内容进入剪贴板，并提供可恢复反馈。
- 快速滚动、百万行跳转和查询采用 Latest-Wins，过期帧或响应不会覆盖当前视图。
- 窄屏下操作栏和指标条局部横向滚动，页面不因一亿逻辑单元格产生纵向溢出。
- Canvas 路径保留有界无障碍镜像，活动单元格和总行列数具有可读语义。

## 自动化验证

完整工程检查通过：

```text
pnpm check:structure
pnpm format:check
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm knip
git diff --check
```

结果：

- Web：27 个测试文件，75 条测试通过。
- Server：10 个测试文件，22 条测试通过。
- Playwright：18 条 Chromium 场景通过。
- Next.js 与 NestJS Production Build 通过。
- Knip 未发现未使用代码或依赖问题，仅输出既有 Configuration Hints。

Playwright 覆盖默认百万行工作台、纯 HTML DOM Cell 约束、紧凑工具栏、自适应高度、键盘选择、查询、复制上限、
Worker 降级、三 Renderer 隔离 Benchmark 和窄屏可访问性，并同时回归 Home、Agent 与 Markdown Lab。

## 用户体验确认

用户已在 2026-07-30 对此前版本的体验清单确认通过，包含默认 1,000,000 × 100 场景、紧凑配置栏、页面高度约束、
Renderer 与查询交互、异常降级、Benchmark、响应式，以及 Agent、Markdown Lab 回归。本轮将 DOM Cell 从
SVG `foreignObject` 改为纯 HTML `div` 后，自动化与浏览器自测均已通过。用户于 2026-07-31 要求提交当前改动，
视为对最终版本的体验确认通过。

## 结论

Large Data Grid 已满足当前自动化与用户体验验收标准，可以进入提交阶段。首期继续作为 React Lab Adapter 运行；
标准 Web Component Adapter 仍按已确认边界留待真实跨框架复用时实现。
