# 数据与缓存架构

## MySQL

- 使用远程 MySQL 的独立 `frontend_study` 数据库。
- Prisma 7 + MariaDB Driver Adapter。
- 首版不创建业务表，只执行无副作用的 `SELECT 1`。
- 未获得用户确认前禁止执行数据库结构变更。

## Redis

- 使用远程 Redis 实例的逻辑 DB 1。
- 使用官方 `node-redis`。
- 以 RESP2 连接，兼容当前不支持 `HELLO` 的 Redis 实例。
- 普通 key 由 node-redis 自动添加 `frontend-study:` 前缀；`SCAN` 等返回 key/匹配模式的命令需显式使用前缀辅助方法。
- 首版只执行 `PING`。
