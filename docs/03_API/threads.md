# Threads API

Thread 是 Agent 会话的持久边界。所有 ID 使用 UUIDv7，响应不包含基础设施连接信息。

## POST `/api/threads`

创建空 Thread。Body 可选：

```json
{ "title": "可选标题" }
```

返回 HTTP 201 和 `ThreadSummary`。

## GET `/api/threads`

按 `updatedAt/id` 倒序分页读取 Thread。

| Query    | 说明                   |
| -------- | ---------------------- |
| `limit`  | 1～100，默认 30        |
| `cursor` | 上一页返回的不透明游标 |

响应包含 `items` 和 `nextCursor`。每个 Item 的 `activeRun` 直接来自 Run 表，不从最后一条 Message 推导。

## GET `/api/threads/:threadId`

返回：

- Thread 元数据；
- 按创建顺序排列的标准 AG-UI Message；
- 当前活跃 Run 的 `runId/status/startedAt/input`，不存在时为 `null`。

前端刷新恢复必须以该接口为唯一事实来源；不得从 localStorage 或最后一条消息恢复 Run。

## DELETE `/api/threads/:threadId`

删除无活跃 Run 的单个 Thread，成功返回 HTTP 204。存在活跃 Run 时返回 HTTP 409，避免删除正在执行的生产任务。
