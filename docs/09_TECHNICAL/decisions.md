# 架构决策

## ADR-001 · 使用 Labs 垂直切片

路由仅负责接入，实验逻辑集中在 `src/labs/`。这样可以将 Next.js 路由约定与可测试的实验核心分离。

Lab 独立是设计原则，不使用 ESLint 强制边界；公共抽象在出现真实复用后再提取。

## ADR-002 · 直接连接远程基础设施

本地 NestJS 直接连接远程独立 MySQL 数据库和 Redis DB 1，不要求本机 Docker。CI 使用隔离测试服务，禁止使用私人服务器凭据。

## ADR-003 · Redis 采用编号与前缀双重隔离

使用 DB 1，同时对 Key 和 Channel 使用 `frontend-study:` 前缀。逻辑 DB 不隔离 Pub/Sub，因此前缀仍然必需。
