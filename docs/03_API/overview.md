# API 规范

- 全局前缀：`/api`
- 路径使用复数名词和 kebab-case
- 使用 HTTP 状态表达结果
- DTO 使用 `class-validator`
- Swagger 描述所有公开接口
- 错误响应禁止泄露堆栈、连接信息和密钥

首版接口见 `health.md`。

本地 API Base URL 为 `http://localhost:3101/api`，Swagger 位于
`http://localhost:3101/api/docs`。
