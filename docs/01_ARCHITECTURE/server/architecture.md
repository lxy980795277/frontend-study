# Server 架构

NestJS 按 Feature Module 组织。

```text
AppModule
├── ConfigModule
├── PrismaModule
├── RedisModule
├── HealthModule
├── ThreadsModule
└── AgentStreamModule
```

- PrismaModule 和 RedisModule 是全局基础设施模块。
- Controller 不直接访问 Prisma 或 Redis。
- HealthService 并行探测 MySQL 和 Redis，返回统一状态。
- 启动与关闭过程显式管理连接生命周期。

## Agent Stream Module

- `RunCoordinatorService`：在 MySQL 事务中建立幂等 Run、校验 Input Hash、收敛终态并持久化消息。
- `RunEventStreamService`：管理 Redis Stream、独立阻塞读取连接、Producer Token Lock、Abort Signal、Runtime 和 TTL。
- `SimulatedAgentProducerService`：实现可替换 Producer Port，输出标准 AG-UI Text/Tool/Terminal 生命周期。
- `AgentStreamService`：统一处理首次启动、重复 Attach、游标校验、终态补偿和 Producer 异常收敛。
- `AgentStreamController`：只负责 HTTP/SSE Header、连接关闭、心跳编码和写入背压。

Producer 不依赖浏览器 Request 生命周期。多个 Consumer 可以读取同一 Run Stream，但 Token Lock 保证同一时刻只有一个
Producer。
