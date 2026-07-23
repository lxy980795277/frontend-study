# 数据库与 Redis 规范

## Prisma

- Schema 位于 `apps/server/prisma/schema.prisma`。
- Prisma Config 位于 `apps/server/prisma/prisma.config.ts`。
- Generated Client 位于 `apps/server/src/generated/prisma/`，不得手改。
- Service 通过注入的 PrismaService 使用数据库。
- 查询明确使用 `select`，避免无意义全字段读取。
- 多表写操作使用事务。

## 表结构

- 表名使用 `t_` + snake_case 复数形式。
- Prisma Model 使用 PascalCase 单数形式。
- 主键默认使用 UUIDv7。
- 外键必须添加索引。
- 表和字段必须有说明。
- 业务枚举优先使用字符串和共享字面量联合类型。

## 变更安全

- 新增表或字段前必须完成 Spec、Schema 和 SQL 评审。
- 未获得用户确认不得对远程数据库执行 DDL。
- 禁止 `prisma db push`。
- 已执行的 Migration 禁止修改。
- 当前 Foundation 任务不创建任何业务表。

## 时间

- 业务层统一使用 UTC `Date`。
- 禁止在 Controller、Service 或 Repository 手动执行 ±8 小时偏移。
- 展示时区转换只能发生在前端或专用格式化工具中。

## Redis

- 使用 `node-redis`。
- 使用逻辑 DB 1。
- Key、Stream、Lock 和 Pub/Sub Channel 必须带 `frontend-study:` 前缀。
- 禁止执行 `FLUSHDB` 和 `FLUSHALL`。
- Pub/Sub 使用独立连接。
- 所有临时 Key 必须设置合理 TTL。
