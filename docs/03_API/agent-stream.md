# Agent Stream API

## POST `/api/stream`

首次运行、同页续传和刷新恢复使用同一个 Endpoint。Body 是 AG-UI `RunAgentInput`：

```json
{
  "threadId": "<uuid-v7>",
  "runId": "<uuid-v7>",
  "state": {},
  "messages": [{ "id": "<uuid-v7>", "role": "user", "content": "纯文本" }],
  "tools": [],
  "context": [],
  "forwardedProps": {
    "simulation": {}
  }
}
```

本 Lab 只接受纯文本 User Message；`state` 必须为空对象，`tools/context` 必须为空数组。
`simulation` 只允许可选的 `failAfterChunks` 故障注入。文本分片由服务端每 20ms 推送一次，每片随机为 2～12
个 Unicode 字符；Tool Call 是默认事件流程，客户端不能修改节奏或关闭 Tool Call。

### 恢复语义

- 首次运行：不发送 `Last-Event-ID`，服务端幂等建立 Run 并尝试获取 Producer Lock。
- 同页续传：复用完全相同的 Input，并在 Header 发送内存中的 `Last-Event-ID`。
- 页面刷新：从 Thread 详情取得 `activeRun.input`，不发送旧游标，从 Stream 起点重放。

响应为 `text/event-stream`：

```text
id: 1784797619018-0
data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"...","delta":"..."}

: heartbeat
```

Redis Stream ID 只位于 SSE `id:`，不污染 AG-UI Event Payload。业务事件包含 `RUN_STARTED`、
`MESSAGES_SNAPSHOT`、Text Message、Tool Call、`RUN_FINISHED` 或 `RUN_ERROR`。

### 关键错误

| HTTP | Code                    | 说明                                   |
| ---- | ----------------------- | -------------------------------------- |
| 400  | `INVALID_STREAM_INPUT`  | AG-UI Input 或 Simulation 参数非法     |
| 400  | `INVALID_STREAM_CURSOR` | Last-Event-ID 格式非法                 |
| 404  | `THREAD_NOT_FOUND`      | Thread 不存在                          |
| 409  | `RUN_INPUT_CONFLICT`    | 同一 runId 对应了不同的规范化 Input    |
| 409  | `THREAD_BUSY`           | Thread 已有其他活跃 Run                |
| 410  | `STREAM_EXPIRED`        | 断点已裁剪、游标超界或终态 Stream 过期 |

## POST `/api/stream/abort`

Body：

```json
{ "threadId": "<uuid-v7>", "runId": "<uuid-v7>" }
```

返回 HTTP 202。接口幂等：

1. 活跃 Run 先进入 `CANCELLING` 并设置短期 Abort Signal。
2. Producer 在服务端协作宽限时间内保存非空的部分输出并结束 Run。
3. 若 Producer 已因进程退出而丢失，服务端将孤儿 Run 强制收敛为 `ABORTED`。
4. 服务端通过 Redis 幂等发布唯一的 `RUN_FINISHED`；终态 Run 直接返回已有状态。

浏览器在请求 Abort 后保持 SSE 连接，等待标准终态事件；不得只依据 HTTP 202 声明 Run 已终止。
