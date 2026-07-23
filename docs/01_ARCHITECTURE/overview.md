# 系统架构

## 技术边界

```text
apps/web       Next.js 前端与 Lab 运行平台
apps/server    NestJS API 与基础设施接入
packages       共享配置和跨端类型
docs           项目知识库与交付证明
```

## 依赖方向

```text
apps/web ───────┐
                ├── packages/shared-types
apps/server ────┘

packages/shared-types 不依赖任何 App
```

首版只有健康检查数据流，不包含业务表和具体 Lab。
