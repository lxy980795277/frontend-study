# 后端编码规范

## 模块结构

```text
modules/<feature>/
├── dto/
├── __tests__/
├── <feature>.controller.ts
├── <feature>.service.ts
└── <feature>.module.ts
```

## Controller

- 只处理路由、参数校验、Swagger 和 Service 调用。
- 禁止包含业务判断。
- 禁止直接注入 PrismaService 或 RedisService。
- 返回值必须声明 DTO 类型。

## Service

- 实现业务逻辑，不直接操作 HTTP Request/Response。
- 依赖使用构造函数 `private readonly` 注入。
- 关键入口、出口、外部调用和异常使用 NestJS Logger。
- 日志禁止包含密码、连接串、Cookie 和 Token。

## DTO 与 API

- DTO 使用 `class-validator`。
- Swagger 使用 `@ApiProperty()`、`@ApiOperation()` 和 `@ApiResponse()`。
- 更新 DTO 使用 `PartialType`。
- REST API 使用 `/api` 前缀、复数名词和 kebab-case。
- 使用标准 HTTP 状态码表达结果。

## 配置

- 环境变量通过 ConfigModule 加载并由 Zod 校验。
- 业务代码不得直接读取 `process.env`。
- 配置缺失时启动失败，错误信息不得包含真实值。

## 基础设施

- Prisma 和 Redis 统一封装为全局模块。
- 必须显式管理连接与关闭生命周期。
- 禁止用模块级 Map、Set 保存需要跨实例共享的业务状态。
