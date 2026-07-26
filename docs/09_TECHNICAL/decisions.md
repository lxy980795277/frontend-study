# 架构决策

## ADR-001 · 使用 Labs 垂直切片

路由仅负责接入，实验逻辑集中在 `src/labs/`。这样可以将 Next.js 路由约定与可测试的实验核心分离。

Lab 独立是设计原则，不使用 ESLint 强制边界；公共抽象在出现真实复用后再提取。

## ADR-002 · 直接连接远程基础设施

本地 NestJS 直接连接远程独立 MySQL 数据库和 Redis DB 1，不要求本机 Docker。CI 使用隔离测试服务，禁止使用私人服务器凭据。

## ADR-003 · Redis 采用编号与前缀双重隔离

使用 DB 1，同时对 Key 和 Channel 使用 `frontend-study:` 前缀。逻辑 DB 不隔离 Pub/Sub，因此前缀仍然必需。

## ADR-004 · 统一 Stream Endpoint 与 AG-UI 语义

首次运行和恢复都使用 `POST /api/stream`，身份统一为 `threadId/runId/messageId/toolCallId`。恢复是同一 Run 的
Transport Attach，不是独立业务动作，因此不创建 `/reconnect` 接口。

## ADR-005 · MySQL 持久状态与 Redis 短期事件分工

MySQL 是 Thread、Run 和 Message 的长期事实来源；Redis Stream 是活跃 Run 的短期可回放事件日志。刷新先查 MySQL
决定是否存在 activeRun，再从 Redis 重放，避免把 localStorage 变成隐式数据库。

## ADR-006 · Producer 生命周期与 SSE Consumer 解耦

浏览器断开只结束当前 Consumer，模拟 Agent Producer 继续写入 Redis Stream。分布式 Token Lock 保证多实例、多
Consumer 场景下同一 Run 只启动一个 Producer。

## ADR-007 · Stream ID 属于 Transport

Redis Stream ID 放在标准 SSE `id:` 字段，通过 `Last-Event-ID` 续传；AG-UI Payload 保持协议纯净。前端分别用
Stream ID 做投递幂等、用 AG-UI ID 做领域实体归并。

## ADR-008 · Labs 使用卡片入口而非持久模块导航

`/labs` 是模块发现和切换的唯一入口，只渲染 Lab Registry 生成的卡片。Lab 详情页移除桌面侧边栏和移动端横向导航，
直接使用完整视口，避免永久导航压缩高密度实验工作区；所有详情路由放入 `(detail)` Route Group，以公共 Layout
提供轻量的“返回 Labs”入口。模块之间仍通过独立路由和 Registry 保持清晰边界。

## ADR-009 · 区分真实异常恢复与人工断线演示

POST SSE 使用 `fetch + ReadableStream`，不依赖原生 `EventSource.onerror`。真实网络错误、可重试 HTTP 错误和无终态
EOF 由 Transport 异常与业务状态机驱动自动退避恢复；“模拟断线”是显式教学状态，只关闭 Consumer 并停留在
`disconnected`。用户点击“模拟重连”后，才使用相同 `threadId/runId/input` 和最后 `Last-Event-ID` 重新 Attach。

## ADR-010 · 前端组件使用目录入口

普通 React 组件使用 `<component-name>/index.tsx`，测试与组件共置；App Router 特殊文件和测试后缀除外。前端 Service
与 Store 使用无层级后缀的职责名，NestJS 三段式文件名只保留在后端。该规则由 `pnpm check:structure` 在本地自检和
CI 中共同执行，避免目录结构依赖人工 Review。

## ADR-011 · Markdown 流式渲染采用 Worker Block Diff 与可确认 Revision

Legacy 与 Incremental 共享同一组确定性累积文本帧。Legacy 在主线程执行 `markdown-it → DOMPurify → innerHTML`；
Incremental 在共享 Worker 中执行解析、顶层块分组和 Diff，主线程只应用 `replaceRange`、`tailAppendText` 或
`tailAppendFallbackHtml`。

Worker 为每个 Renderer 保存 Confirmed 与 Pending 两套基线，只有主线程成功应用 Patch 并发送 Commit 后才推进
Confirmed Revision。重复 Revision No-op，过期基线和目标块不匹配触发安全恢复，避免重放造成重复文本。

正文和 React Tools 使用独立 Host。文本快速路径只允许写入明确的块级根节点或 `pre > code`，并与 Patch 携带的完整
Snapshot 做结果校验；无法证明一致时立即替换完整块，不通过“最深末尾元素”猜测追加位置。

Worker Error、Message Error、请求超时和 Apply 冲突统一降级为经 DOMPurify 清理的主线程全量渲染。该实现先保留在独立
Lab，不替换公共 Markdown 组件，也不在出现真实复用前提取 Package。

性能测试使用一份公共静态 Markdown 源，在浏览器中固定复制 10 份形成约 47 万字符的历史基线。基线渲染通过
`committedContentLength` 明确确认，不使用延时猜测；确认后重置 Collector，只测量尾部确定性续写。这样对比的是
“超大历史上下文上继续生成”的主线程成本，同时避免在仓库中维护十份重复 Fixture。
