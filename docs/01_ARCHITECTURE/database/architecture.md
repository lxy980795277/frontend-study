# 数据与缓存架构

## MySQL

- 使用远程 MySQL 的独立 `frontend_study` 数据库。
- Prisma 7 + MariaDB Driver Adapter。
- 使用受控 Migration 管理 `t_threads`、`t_agent_runs`、`t_messages`。
- 未获得用户确认前禁止执行数据库结构变更。

### 数据职责

- `t_threads`：Thread 元数据与历史列表排序。
- `t_agent_runs`：原始 AG-UI Input、Input Hash、Run 状态、起止时间和稳定失败信息。
- `t_messages`：按 Thread/Run 保存标准 AG-UI Message JSON，并标记 Completed/Interrupted。

同一 `runId` 只能对应一个规范化 Input Hash；同一 Thread 通过事务锁保证最多一个活跃 Run。

## Redis

- 使用远程 Redis 实例的逻辑 DB 1。
- 使用官方 `node-redis`。
- 以 RESP2 连接，兼容当前不支持 `HELLO` 的 Redis 实例。
- 普通 key 由 node-redis 自动添加 `frontend-study:` 前缀；原生命令通过 `buildKey()` 显式补全前缀。
- 健康检查执行 `PING`，Agent Lab 使用 Redis Stream 和短期协调 Key。

### Agent Stream Key 空间

```text
frontend-study:agent-stream:runs:<runId>:events
frontend-study:agent-stream:runs:<runId>:producer-lock
frontend-study:agent-stream:runs:<runId>:abort
frontend-study:agent-stream:runs:<runId>:runtime
frontend-study:agent-stream:runs:<runId>:terminal-published
```

- 活跃 Stream TTL 为 1 小时，终态 Stream TTL 为 30 分钟。
- Stream 近似裁剪到 10000 个事件。
- Producer Lock 使用唯一 Token、Lua 安全续租和安全释放。
- 终态通过 Lua 保证最多发布一次。
- 不使用 `FLUSHDB`、`FLUSHALL` 或无范围删除。
