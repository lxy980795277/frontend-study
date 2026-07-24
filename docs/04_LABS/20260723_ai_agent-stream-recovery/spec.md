# Agent Stream Recovery

## Intent

实现一个尽可能贴近生产环境的 Agent 流式会话恢复实验：前端通过统一的 AG-UI HTTP + SSE
接口发起运行，在连接中断、页面刷新和重复投递场景下恢复同一个运行，并保证消息不丢失、不重复、不会启动重复
Producer。

本 Lab 只模拟 Agent 推理过程；HTTP、SSE、AG-UI 事件、MySQL 持久化、Redis Stream、断线恢复、终止和前端状态归并均使用真实实现。

## Constraints

- Lab 页面和业务实现必须独立，不得依赖其他 Lab。
- 前后端标识统一使用 AG-UI 语义：`threadId`、`runId`、`messageId` 和 `toolCallId`。
- 流式入口统一为 `POST /api/stream`，新运行和恢复运行不得拆分为不同接口。
- 请求与事件采用 AG-UI 协议；本阶段用户输入仅支持纯文本，`state`、`tools` 和 `context` 使用空值。
- Agent 内容由可替换的模拟 Producer 生成，Producer 生命周期不得依附单个浏览器连接。
- 模拟 Producer 默认生成长篇结构化回复和 Tool Call；文本由服务端每 20ms 以随机长度分片推送。
- 前端不得控制 Chunk 间隔或关闭 Tool Call，`simulation` 只保留 Producer Failure 注入。
- Redis Stream 是活跃 Run 的事件回放来源；MySQL 是 Thread、Message 和 Run 状态的持久化来源。
- 页面内重连只在内存保存最后一个 SSE ID，并通过 `Last-Event-ID` 请求头续传。
- 页面刷新不得从 localStorage 或 sessionStorage 恢复消息、Run 状态或 SSE 游标。
- 当前 Thread 由 URL 表达；刷新后必须通过 Thread 历史详情接口恢复消息并判断是否存在活跃 Run。
- 刷新恢复不携带旧游标，从 Redis Stream 起点重放，并在前端幂等归并。
- 前端创建通用 `services` 目录，所有模块复用无业务耦合的 JSON 请求和 SSE 请求封装。
- 公共请求封装参考 magic-book 的成熟能力，但删除企业身份、Workspace、Document 等业务依赖并修正已识别的可靠性问题。
- Redis 使用 DB 1，所有 Key、Stream、锁和信号沿用 `frontend-study:` 前缀。
- 数据库结构变更必须提供 Prisma Schema 和受控 SQL Migration，禁止使用 `prisma db push`。
- 禁止执行 Redis `FLUSHDB`、`FLUSHALL` 或无范围 Key 删除。
- 真实环境配置和密钥不得进入 Git。

## Acceptance Criteria

1. `/labs/agent-stream-recovery` 是独立 Lab 页面，并出现在 Labs 导航中。
2. 用户可以创建 Thread、输入纯文本并通过 `POST /api/stream` 接收真实 SSE 流。
3. 请求体符合 AG-UI `RunAgentInput` 结构，服务端输出标准 AG-UI 生命周期事件。
4. 新运行使用新的 `runId`；恢复连接复用原有 `threadId/runId`，且不会重复启动 Producer。
5. 页面内连接中断后，前端使用内存中的 SSE ID 和 `Last-Event-ID` 自动续传。
6. 页面刷新后，前端从 URL 获取 `threadId`，请求历史详情并根据服务端返回的 `activeRun` 判断是否恢复。
7. 页面刷新恢复不读取持久化游标，能够从 Redis Stream 起点重放活跃 Run。
8. 重放、重复事件和历史消息交叠时，界面不会产生重复消息或重复文本。
9. 同一个 `runId` 的多个消费者只订阅同一个 Producer；冲突输入返回明确的 HTTP 409。
10. 用户主动终止 Run 后，服务端完成终止状态收敛，前端不会把主动终止当成网络断线继续重连。
11. 未收到 `RUN_FINISHED` 或 `RUN_ERROR` 就结束的连接被识别为异常断线，而不是正常完成。
12. Thread 历史详情直接返回结构化 `activeRun`，前端不得从最后一条消息推导 `runId`。
13. 公共 `base-request` 支持超时取消、统一错误、JSON/FormData 和响应解包。
14. 公共 `base-sse` 支持 UTF-8 分片、CRLF、注释心跳、多行 `data`、SSE `id`、Abort 和异常 EOF。
15. Lab 提供连接状态、当前 Run、最后游标和重连次数等可观察信息，以及可控的断线模拟入口。
16. 自动化测试覆盖 SSE 解析、事件归并、重连状态机、Producer 幂等、Redis 回放和刷新恢复主流程。
17. API、架构、数据模型、状态机、异常策略和验证方法均有对应文档。
18. 默认 Mock 回复容量不少于原始短回复的 5 倍，并包含完整 Tool Call 生命周期。
19. 页面操作区依次展示新会话、会话历史、模拟断线/模拟重连和手动重试；后两项使用 Primary 配色。
20. Labs 详情页使用紧凑型外层留白并铺满可用内容区域；对话区和事件面板自动占满标题区下方的剩余高度。
21. `/labs` 只展示模块入口卡片；所有 Lab 详情页均不展示平台侧边栏或移动端模块导航。
22. `/labs` 使用 1280px 最大宽度容器、透明背景系统主题双插画 Hero 和桌面端一行四列模块卡片；Hero
    与卡片网格左右边界对齐。
23. Agent Lab 空会话时对话区保持留白；输入框底部居中且限制最大宽度，发送与停止操作以纯图标收敛在输入框右下角。
24. 公共 `MarkdownRenderer` 统一提供安全 Markdown/GFM 渲染；Agent 回复使用 Markdown，用户消息保持纯文本。
25. 对话区统一使用 12px 字号，不展示用户与 Agent 角色标签；Agent 消息外层不显示边框，用户消息使用紧凑内边距和
    4px 圆角。
26. 所有 Lab 详情页右上角统一提供“返回 Labs”入口，点击返回 `/labs` 卡片目录。
27. “模拟断线”只关闭当前 SSE Consumer 并进入 `disconnected`，不得自动恢复；按钮切换为“模拟重连”，只有用户点击
    后才携带最后 `Last-Event-ID` 续传。真实网络错误和异常 EOF 仍采用自动退避恢复。
28. 所有 Lab 详情页由 `(detail)` 公共 Layout 统一提供响应式页面 Padding；具体模块不得重复定义外层间距。

## UseCase

### 主路径

用户进入 Lab 后创建 Thread，发送一条纯文本消息。前端立即展示用户消息，并消费模拟 Agent 通过 AG-UI
事件逐步生成的回复。Run 正常结束后，Thread、用户消息、助手消息和 Run 终态可以通过历史接口重新读取。

### 页面内断线恢复

Run 仍在生成时，用户点击“模拟断线”。当前 SSE Consumer 关闭，模拟 Producer 继续运行并写入 Redis Stream；页面
保持 `disconnected`，不自动恢复。用户随后点击“模拟重连”，前端保留最后收到的 SSE ID，使用相同的
`threadId/runId` 和 `Last-Event-ID` 重新连接，只消费断点之后的事件。

### 页面刷新恢复

Run 仍在生成时刷新页面。前端从 URL 获取 `threadId`，请求 Thread 历史详情，恢复持久化消息并读取
`activeRun`。随后使用相同 `threadId/runId` 重新请求 `/api/stream`，不携带游标，从 Stream 起点重放并幂等归并。

### 重复连接与并发消费

同一个 Run 被同一页面或多个页面重复连接时，所有消费者读取同一条 Redis Stream，服务端不会创建第二个
Producer。若相同 `runId` 被用于不同 Thread 或不同输入，服务端拒绝请求并返回冲突信息。

### 主动终止

用户点击停止后，前端请求服务端终止当前 Run，但保留 SSE 连接等待标准终止事件。超过宽限时间仍未收敛时，
前端才强制断开连接，并将该行为与网络异常分开记录。若 Run 的原 Producer 已因服务进程退出而丢失，重复
Abort 仍必须由服务端兜底收敛为 `ABORTED`，不能永久停留在 `CANCELLING`。

### 异常路径

- MySQL、Redis 或 SSE 接口不可用时，页面展示可恢复的错误状态。
- Redis Stream 已过期或游标无效时，服务端返回明确错误，前端回退到历史详情重新同步。
- Producer 失败时发送 `RUN_ERROR` 并持久化失败终态。
- HTTP 连接无终态事件提前结束时，前端按重连策略处理。
- Thread 不存在、Run 不属于当前 Thread 或请求载荷冲突时，服务端拒绝恢复。

## Tasks

- [x] 确认生产化目标、AG-UI 标识、统一接口和恢复语义
- [x] 将 Foundation 快进合并到本地 `main`
- [x] 创建 `feat/agent-stream-recovery` 分支与 Lab Spec
- [x] 完成前后端、MySQL、Redis、AG-UI 和 UI 详细设计
- [x] 建立共享协议类型与公共请求层
- [x] 建立 Thread、Message、Run 数据模型和受控 Migration
- [x] 实现 Thread 历史接口
- [x] 实现 Redis Stream 存储、读取、锁、终止信号和过期策略
- [x] 实现模拟 Agent Producer 和统一 Stream 接口
- [x] 实现前端 AG-UI Reducer、连接状态机和 Store
- [x] 实现 Lab 页面、历史切换、可观察面板和故障注入
- [x] 补充单元、集成和 Playwright 测试
- [x] 同步 API、架构、技术决策和用户文档
- [x] 执行完整自动化自测
- [ ] 完成用户体验验证
