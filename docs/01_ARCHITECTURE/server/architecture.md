# Server 架构

NestJS 按 Feature Module 组织。

```text
AppModule
├── ConfigModule
├── PrismaModule
├── RedisModule
└── HealthModule
```

- PrismaModule 和 RedisModule 是全局基础设施模块。
- Controller 不直接访问 Prisma 或 Redis。
- HealthService 并行探测 MySQL 和 Redis，返回统一状态。
- 启动与关闭过程显式管理连接生命周期。
