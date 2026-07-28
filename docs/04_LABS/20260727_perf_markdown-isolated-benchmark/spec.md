# Markdown Isolated Benchmark

## Intent

为 Markdown 流式增量渲染 Lab 增加一套可复现的隔离基准模式，解决 Legacy 与 Incremental 在同一页面同时运行时争用主线程、
浏览器帧预算和内存资源，导致两侧指标不能代表各自独立性能的问题。

原有双栏模式继续承担视觉一致性、Patch 行为、降级、滚动跟随和共存压力验证；新增隔离基准模式在同一个固定尺寸工作区内，
按轮次交替、串行挂载 Legacy 与 Incremental。任意时刻只允许一个 Renderer 存在，以独立记录每个实现的主线程成本、端到端
提交延迟、长任务和总运行时间。

## Positioning

- 路由保持 `/labs/markdown-stream-rendering`，不创建重复 Lab。
- 页面包含 `同步对比` 和 `隔离基准` 两种模式，默认进入同步对比。
- 模式写入 URL Query：`?mode=compare` 或 `?mode=benchmark`，便于刷新和分享。
- 同步对比用于功能和共存压力验证，指标明确标记为“共存负载”。
- 隔离基准用于相同输入、相同可视尺寸、单 Renderer 独立运行下的性能测量。
- 本次能力仍为纯前端实验，不新增后端、MySQL 或 Redis 依赖。

## Constraints

### 测量隔离

- 隔离基准任意时刻只能挂载一个 Renderer；不得用 CSS 隐藏另一个 Renderer。
- 每次执行之间必须卸载当前 Renderer，并等待浏览器完成资源清理和帧稳定后再开始下一次执行。
- Legacy 与 Incremental 使用相同 Markdown 基线、续写内容、Seed、Chunk 边界、推送速度和容器尺寸。
- 不执行预热任务；用户配置的每一次执行都是真实测量并进入报告。
- 轮次采用交替顺序：奇数轮 `Legacy → Incremental`，偶数轮
  `Incremental → Legacy`，降低固定顺序、缓存和热机偏差。
- 测量从第一帧发出前开始，到最终内容已经提交到 DOM 后结束，不能在 Streamer 仅完成分发时提前结束。
- Benchmark 运行期间必须锁定模式、场景、速度、切分、实例和轮次配置；用户只能停止当前任务。
- 停止、切换模式和页面卸载必须取消 Timer、RAF、Idle Callback、Performance Observer、Worker Handler 和 React Root。

### 数据与交互

- 配置包含场景、推送速度、Chunk 切分、实例数量和轮次。
- 首版实例数量固定为 `1`，在界面中明确说明这是单实例隔离基准，不伪装成未实现的多实例测量。
- 使用与同步对比相同的 10 倍超长 Markdown 基线和确定性续写 Fixture。
- 不在隔离基准中提供 Worker 故障注入；故障降级继续由同步对比验证。
- 运行前展示配置，运行中展示当前 Renderer、正式轮次和实时指标。
- 完成后展示汇总对比、逐轮明细、最终内容一致性，并支持导出 JSON。
- 同步对比保留现有交互和双栏，不因隔离模式改变渲染算法。

### 指标口径

- 主线程执行：Legacy 的完整解析/消毒/DOM 替换；Incremental 的 Patch Apply 和 React Tools Mount。
- 帧提交延迟：单个输入帧发出到对应累积内容实际提交到 DOM 的端到端时间。
- 延迟汇总至少包含 P50、P95、平均值和最大值。
- 总运行时间：首个正式输入帧发出到最终 DOM Commit 的墙钟时间。
- 长任务：正式测量区间内由 Long Tasks API 观察到的任务数量、累计时长和最大时长。
- 调度指标区分输入帧、DOM Commit、Worker Request 和 Coalesced Frame。
- 每个正式执行保存独立结果，汇总值不得覆盖逐轮原始数据。
- 最终一致性比较规范化后的可见文本摘要，而不是只比较输入字符串。
- 不设 CI 固定性能阈值，不在未实测时承诺具体倍数收益。

## Acceptance Criteria

1. 页面顶部提供 shadcn 风格的 `同步对比 / 隔离基准` 模式切换。
2. 模式由 `mode` Query 驱动，缺失或非法值回退到 `compare`。
3. 同步对比保留现有双栏能力，性能文案明确标记为共存负载。
4. 隔离基准工作区在任意时刻的 DOM 中只存在一个 Legacy 或 Incremental Renderer。
5. 两个 Renderer 使用相同固定可视尺寸、基线、续写帧和配置。
6. 不创建额外预热 Execution；总执行数严格等于 `轮次 × 2`，且全部计入报告。
7. 奇偶轮按照相反顺序运行，并在报告中保留真实执行顺序。
8. 配置支持场景、速度、切分和轮次；实例数明确固定为 1。
9. 运行期间模式和配置不可修改，停止按钮可以立即终止剩余任务。
10. 每次执行完成条件是最终内容已经提交到 DOM，而不是流输入已经分发完毕。
11. 报告展示主线程耗时、提交延迟 P50/P95/最大值、总运行时间、长任务和调度计数。
12. 报告包含每轮 Legacy 与 Incremental 明细及最终内容一致性。
13. JSON 导出包含配置、环境、执行顺序、原始执行结果和汇总结果。
14. 停止、切换模式和卸载后不存在残留 Timer、Observer、Worker Handler 或 Renderer。
15. 核心计划、百分位数、汇总和取消行为具备 Vitest 覆盖。
16. Playwright 覆盖模式 Query、单 Renderer 挂载、交替顺序、停止和 JSON 导出主流程。
17. Format、Lint、Type Check、Unit Test、Build、Knip、Structure 和 E2E 全部通过。

## Use Cases

### 同步对比

用户进入默认模式，同时观察同一输入下 Legacy 与 Incremental 的渲染结果、Patch、滚动跟随和共存压力。页面明确提示此处
指标受到两种实现同时运行影响，适合功能与共存场景分析，不代表各自独占页面时的性能。

### 隔离基准

用户切换到隔离基准，选择场景、速度、切分和轮次并开始。系统直接按奇偶轮交替顺序执行正式测量。工作区始终只显示当前
Renderer，上一执行被完整卸载并稳定后才开始下一执行。

### 结果分析

任务完成后，用户先查看 Legacy 与 Incremental 的汇总指标，再展开逐轮明细判断离散程度、顺序偏差和长任务。最终一致性为
通过时，说明两种实现的规范化可见内容相同；性能结论仍以当前设备、浏览器和生产构建环境为边界。

### 中止任务

用户在正式轮次中点击停止。当前流、观察器和 Renderer 被释放，已完成的结果可以保留并标记为未完成报告，用户修改配置后
可以重新开始一轮全新的 Benchmark。

## Edge Cases

- URL 中 `mode` 缺失、重复或非法。
- 基线仍在 Loading、加载失败或重试期间点击开始。
- 轮次切换时上一个 Worker Response、RAF Commit 或 Long Task Entry 延迟到达。
- 最后一帧已经发出但 Incremental 仍在合并 Target 或等待 Patch Commit。
- React Strict Mode 下 Effect 建立和清理被重复执行。
- 用户在正式执行、执行间稳定阶段或结果完成后点击停止。
- 页面隐藏、浏览器降频导致 RAF 和 Timer 大幅延迟。
- 浏览器不支持 Long Tasks API。
- Renderer 最终提交内容长度正确，但 DOM 可见文本不一致。
- 导出时任务未完成或浏览器禁止对象 URL 下载。

## Out of Scope

- 通过 iframe、Web Worker DOM 或独立浏览器进程实现操作系统级完全隔离。
- 服务端保存、多人共享或跨设备聚合 Benchmark 结果。
- 在 CI 中建立固定的毫秒数或性能倍数门禁。
- 将实例数扩展为多实例压力 Benchmark。
- 在隔离模式中测试 Worker Crash、Fallback 或安全攻击场景。
- 修改 Legacy 或 Incremental 的核心渲染策略以获得更好测试结果。

## Tasks

- [x] 确认同步对比与隔离基准的职责边界。
- [x] 确认 URL 模式、串行单挂载、无预热和交替轮次方案。
- [x] 完成状态机、数据结构、指标、UI 和测试设计。
- [x] 实现 Benchmark 计划、统计和报告纯函数。
- [x] 实现单 Renderer 串行 Runner、取消和资源稳定逻辑。
- [x] 实现模式切换、配置区、运行工作区和结果报告。
- [x] 为同步对比补充共存负载语义。
- [x] 实现最终可见文本一致性摘要和 JSON 导出。
- [x] 补充 Unit 测试和真实 Playwright 浏览器场景验证。
- [x] 同步原 Lab Technical、架构、约束、用户指南和踩坑记录。
- [x] 执行完整工程自检与 Production Browser 验证。
- [ ] 完成用户体验验证。
