# Agent Stream Recovery Verification

## 环境

- Node.js `24.11.0`
- pnpm `11.16.0`
- Web `http://localhost:3100`
- API `http://localhost:3101/api`
- 远程独立 MySQL 数据库
- 远程 Redis DB 1 + `frontend-study:` Key Prefix
- Chromium / Playwright `1.61.1`

真实配置文件未进入 Git，验证日志不记录数据库或 Redis 连接信息。

## 主路径

- 创建 Thread 后 URL 写入 `threadId`。
- `POST /api/stream` 返回标准 SSE，并按 AG-UI 生命周期增量渲染 Assistant Message。
- Tool Call 的 Start、Args、End 和 Result 能归并到同一 Assistant Message。
- Run 完成后，Thread 详情可读取 User/Assistant/Tool Message，`activeRun` 收敛为 `null`。
- 页面刷新后从 MySQL 历史恢复终态消息。

## 恢复路径

### 页面内断线

- 生成中主动关闭 Browser Consumer。
- 页面稳定停留在 `disconnected`，500ms 内未自动发起新的 Stream 请求。
- 用户点击“模拟重连”后，前端使用相同 `threadId/runId/input` 并携带非空 `Last-Event-ID` 重新连接。
- Producer 未重复启动，最终 `reconnectAttempt=1`、`duplicateEvents=0`。
- Assistant Message 只有一条，文本无重复。

### 页面刷新

- 活跃 Run 生成中执行完整 Page Reload。
- 新页面只从 URL 读取 `threadId`，调用 Thread 详情获得结构化 `activeRun.input`。
- 不携带持久化 Cursor，从 Redis Stream 起点重放并归并。
- localStorage/sessionStorage 中没有 Lab 业务 Key。

## 异常路径

- 注入 Producer Failure 后收到 `RUN_ERROR`，前端进入 `failed`。
- 主动 Stop 在 Server Acceptance 后可用，服务端返回 HTTP 202，最终收到 Aborted Terminal，未进入重连循环。
- 服务进程退出后遗留的 `CANCELLING` Run 可通过重复 Abort 强制收敛为 `ABORTED`，Thread 不再保留
  `activeRun`。
- 前端停止宽限期超时只进入 `failed`，不会在缺少 AG-UI Terminal 时伪装为 `aborted`。
- 非法、过期和超出当前 Stream 上界的 Cursor 被拒绝。
- 慢客户端写入背压同时监听 `drain/close`，连接关闭不会遗留等待。
- 请求提前 EOF 且没有 AG-UI Terminal 时按异常断线处理。

## 自动化验证

`pnpm check`：

- Prettier：通过
- ESLint：通过
- TypeScript：通过
- Vitest：后端 10 个 Test File / 22 条 Test，通过
- Vitest：前端 5 个 Test File / 16 条 Test，通过
- NestJS Build：通过
- Next.js Production Build：通过，Lab 路由完成静态构建
- Knip：通过，无 Unused File/Dependency/Error

`pnpm test:e2e`：

- 6 条 Chromium 用例全部通过。
- 覆盖 Home → Labs 卡片入口、桌面端与移动端无侧栏布局、断线续传、刷新恢复、Producer Failure 和主动 Abort。
- Agent E2E 用例并行运行，每条只删除自己创建的 Thread。
- 用户反馈修复后，主动 Abort 用例再次单独回归通过。

此外使用 Playwright CLI 以 1200px 和 1440px 视口完成真实浏览器视觉检查；断线和刷新两条恢复路径均在真实
MySQL/Redis 链路上手工复核。

长对话布局使用 Playwright CLI 在 1440×1000 视口追加两轮完整回复后复核：

- Chat Panel 高度保持 696px，不随消息数量增长。
- Message Viewport 为 470px，内容高度达到 872px 后产生内部滚动。
- 自动跟随时距底部小于 1px，Prompt Composer 与输入框保持完整可见。
- 浏览器控制台无 Error、Warning；验证产生的 Thread 已按 ID 清理。

右侧 Inspector 在同一视口下复核：Card 内容区高度为 662px，Event TabPanel 和 Event ScrollArea 均为
610px，已完整占用 Tab List 下方的全部剩余空间；控制台无 Error、Warning。

Mock 内容与操作区调整后再次验证：

- 默认 Assistant 正文约 2857 字，超过原始短回复 5 倍，并持久化 `searchKnowledge` Tool Call/Result。
- 在远程 Redis 链路上，20ms 本地生产节拍的完整 Run 约 7.3 秒完成。
- 顶部按钮严格按新会话、会话历史、模拟断线/模拟重连、手动重试排列，后两项使用 Primary Variant。
- 故障页签只保留 Producer Failure 注入，不再提供 Chunk 间隔和 Tool Call 开关。
- 调整后的 6 条 Playwright E2E 全部通过，控制台无 Error、Warning，验证 Thread 均已精确清理。

Labs 卡片入口页在 1600×1000 与 390×844 视口下再次复核：

- 页面内容限制在 1280px 最大宽度内，桌面端 Hero 使用左插画、中央标题、右插画三栏结构。
- Hero 与模块卡片网格实测宽度均为 1280px，左右边界均为 160px / 1440px。
- 模块卡片在桌面端按四列布局；移动端切换为单列，双插画并排放置在标题说明下方。
- 页面未重新引入平台侧边栏、移动端模块导航、数量或目录标题。
- 两张本地插画均为 768×511、带 Alpha 通道的透明 PNG，页面无矩形底色，浏览器控制台无 Error、Warning。

Lab 详情公共返回入口在 1440×1000 与 390×844 视口下复核：

- `(detail)` Route Group Layout 在右上角统一展示“返回 Labs”，目录页不受影响。
- 点击入口返回 `/labs`；桌面端不遮挡操作区，移动端通过独立导航行避免遮挡标题。
- 开发环境下入口为 Next.js Dev Tools 浮层预留右侧空间，浏览器控制台无 Error、Warning。
- 同一 Layout 统一注入详情页外层 Padding：桌面端实测为水平 32px / 垂直 28px，移动端实测为 20px。
- Agent 页面已移除自身外层 Padding，双栏工作区、Composer 固定位置和移动端滚动保持正常。

Agent Composer 在 1600×1000 视口下再次复核：

- 空会话的 Message Timeline 不显示引导图标、标题、说明或占位卡片。
- 输入框宽度限制为 768px，并在 Chat Panel 内水平居中。
- Composer 外层无顶部分隔线；输入框使用加大的上下左右内边距。
- 发送按钮为 32×32px 纯图标按钮，固定在输入框右下角；字数统计位于左下角。
- Enter 发送、Shift + Enter 换行和运行中停止行为均保持不变，调整后的 6 条 E2E 全部通过。

对话消息样式在真实历史 Thread 下再次复核：

- 消息列表不再渲染 `You` 和 `Agent` 角色标签，流式与中断状态提示保持可见。
- 用户气泡实测字体为 12px、内边距为 8px 12px、圆角为 4px。
- Agent 消息实测字体为 12px、外边框为 0；Markdown 标题与正文均收敛为 12px。
- Thread 标题和输入框实测字体均为 12px，右侧观测面板字号不受影响。
- 浏览器控制台无 Error、Warning，验证过程只读取已有 Thread。

公共 Markdown 渲染能力再次复核：

- `MarkdownRenderer` 正确渲染标题、段落、列表、GFM 表格、链接与代码，并跳过原始 HTML。
- Agent 流式正文在生成过程中直接投影为 Markdown，用户消息仍按纯文本展示。
- 真实 Mock 回复的 12 个章节、生产检查列表与 Tool Call 卡片能够同时显示。
- 浏览器控制台无 Error、Warning；验证创建的 Thread 已按精确 ID 删除。

## 用户体验确认

待用户在本地体验后确认。

## 结论

自动化自测与工程验证已完成，当前进入 Step 5 用户体验确认；确认前不提交。
