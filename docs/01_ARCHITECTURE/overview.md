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

当前包含 Foundation 健康检查和首个独立实验 `agent-stream-recovery`。实验使用 MySQL 保存
Thread/Run/Message 的持久状态，使用 Redis Stream 保存活跃 Run 的短期可回放事件。

## Agent Stream Recovery 数据流

```text
Browser
  ├── GET /threads/:threadId ─────────────► MySQL 历史与 activeRun
  └── POST /stream + Last-Event-ID ───────► SSE Consumer
                                               │
Simulated Agent Producer ─► Redis Stream ◄─────┘
          │
          └───────────────────────────────────► MySQL Run/Message 终态
```

Agent 推理是可替换的模拟实现，其余 HTTP、SSE、AG-UI、数据库、Redis Stream 和恢复状态均为真实链路。

## 本地端口

- Web：`http://localhost:3100`
- API：`http://localhost:3101/api`
- Web 通过 `/backend/*` 将请求代理到本地 API。
