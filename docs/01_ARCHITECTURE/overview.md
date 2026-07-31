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

## Frontend Lab 组织

每个 Lab 使用相同的垂直切片边界：

```text
labs/<lab>/
├── components/    # index.tsx 入口及 Workbench、Benchmark、Renderer、Overlay 业务层级
├── types/         # 除组件 Props 外的领域类型
├── hooks/         # React 状态与生命周期编排
├── core/          # 无 React 依赖的算法与状态转换
└── browser/       # Worker、Observer、Canvas 等浏览器适配
```

Lab 上下文已经由 `labs/<lab>/` 表达，`components/` 下不再增加重复的 `lab/` 包装层。组件路径继续表达拥有关系，
类型目录只包含类型声明。`check:structure` 使用 TypeScript AST 同时约束目录、类型归属和运行时函数语法。

## Large Data Grid 边界

`large-data-grid` 是纯前端独立 Lab，不新增 API、数据库或 Redis 依赖。路由只负责加载模块，React 管理工作台和
Benchmark 生命周期，核心数据、几何、滚动、选择、查询、调度与绘制保持为纯 TypeScript。

```text
Controls / Pointer / Keyboard
            │
            ▼
React Workbench Adapter
            │ versioned snapshot
            ▼
Pure Grid Core
  ├── deterministic lazy data source
  ├── column prefix + 2D visible range
  ├── segmented native scroll model
  ├── stable-ID selection + bounded TSV
  └── latest-wins query / frame scheduling
            │
            ├── Pure HTML DOM virtual window
            ├── Main-thread Canvas
            └── Worker + OffscreenCanvas
                       └── failure → fresh Canvas → Main Canvas
```

默认场景是 1,000,000 行 × 100 列。未查询时不建立百万行投影，更不会建立完整单元格矩阵；排序或过滤只使用
`Uint32Array` 行索引。三种 Renderer 共享同一数据生成、几何、格式化和可见摘要，未来如需跨框架使用，应增加
Web Component Adapter，而不是重写核心。

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
