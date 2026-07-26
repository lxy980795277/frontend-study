# Markdown Stream Rendering Verification

## 环境

- Node.js `24.11.0`
- pnpm `11.16.0`
- Next.js `16.2.11`
- Chromium / Playwright `1.61.1`
- Web `http://localhost:3100/labs/markdown-stream-rendering`

本 Lab 是纯前端实验，不访问 MySQL、Redis 或生产数据。

## 功能验证

- Labs 卡片能够进入独立 Markdown 流式增量渲染页面，并可返回 Labs。
- Legacy 与 Incremental 消费相同的确定性 Stream Frame。
- Worker 完成 Markdown 解析、顶层 Block Diff 和带 Revision 的 Patch 生成。
- 主线程正确应用 `replaceRange`、`tailAppendText` 与 `tailAppendFallbackHtml`。
- Worker 故障后进入经 DOMPurify 处理的安全 Full Render Fallback。
- 代码块复制、折叠和表格 TSV 复制工具与 Markdown Content Host 隔离。
- XSS Fixture 中的脚本、事件属性和危险 URL 未执行。

## 超大基线

- 静态 Markdown 源约 4.7 万字符、800 行。
- 两个 fenced code block 分别为 333 行和 327 行。
- 浏览器运行时固定复制 10 份，形成约 47 万字符的相同双栏基线。
- Incremental Renderer 通过 `committedContentLength` 确认基线，不使用固定延时猜测。
- 基线准备期间 Metrics 保持为零，Ready 后只统计尾部流式续写。
- 静态资源 Loading、HTTP Error、Retry 和 Abort 路径均有单元或 E2E 覆盖。
- 超长代码块最大高度为 22rem，纵向和横向溢出均限制在代码块内部。

## 滚动与布局

- Legacy 与 Incremental 的每个实例默认跟随增量内容到底部。
- 用户向上滚动后只暂停当前实例，重新回到底部后恢复跟随。
- 1× 与 4× 模式下实例状态互不干扰。
- 桌面双栏保持等高，Renderer 和 Inspector 使用局部滚动。
- 移动端改为纵向布局，页面没有横向溢出。

## 自动化验证

`pnpm check` 和提交前等价检查：

- Structure：通过
- Prettier：通过
- ESLint：通过
- TypeScript：通过
- Web Vitest：14 个 Test File / 42 条 Test，通过
- Server Vitest：10 个 Test File / 22 条 Test，通过
- Next.js / NestJS Production Build：通过
- Knip：通过，无 Unused File/Dependency Error

`pnpm test:e2e`：

- 13 条 Chromium 场景全部通过。
- 覆盖超大基线、失败重试、指标隔离、代码块内部滚动、内容一致性、XSS、Worker Fallback、响应式、自动跟随和
  多实例隔离。

真实浏览器检查中控制台无 Error 或 React Warning。

## 当前性能口径

当前双栏同时渲染，采集结果代表 Legacy 与 Incremental 共存时的实际负载，不是两个方案各自独立运行时的无干扰
性能。双栏可用于内容一致性、Patch 正确性、交互和压力观察；独立性能结论将在后续串行隔离 Benchmark 中完成。

## 用户体验确认

用户完成当前页面体验，并明确要求先提交当前实现；同时指出双栏并发会互相影响独立性能口径。该问题已记录为后续
串行隔离 Benchmark 任务，不在本次基线提交中修改渲染调度架构。
