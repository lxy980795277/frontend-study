# Project Foundation · Technical Design

> 后续布局演进：Labs 已改为纯卡片入口，所有 Lab 详情页不再提供平台侧边栏。当前实现以
> `docs/01_ARCHITECTURE/web/architecture.md` 为准；下文保留 Foundation 首次交付时的技术背景。

## 目标

为后续高阶前端实验提供可独立演进的全栈运行底座。Foundation 只负责平台能力，不预置具体实验实现。

## Monorepo 边界

```text
apps/web                   Next.js 平台、路由与 Lab 容器
apps/server                NestJS API 与基础设施生命周期
packages/shared-types      前后端共享契约
packages/eslint-config     通用、Next.js、NestJS 分层规则
packages/typescript-config 通用、Next.js、NestJS 编译配置
docs                       Spec、架构、约束、验证与发布证据
```

Turborepo 根据 workspace 依赖先构建 `shared-types`，再执行 Web 和 Server 的类型检查、测试与构建。应用不得反向成为共享包的依赖。

## Web 数据流

```text
RootLayout
├── HomePage
│   ├── HomeHeader
│   ├── HealthPanel (Client Component)
│   │     └── getHealth()
│   │           └── GET /backend/health
│   │                 └── Next.js rewrite → NestJS /api/health
│   └── LabsEntryCard → /labs
└── LabsLayout
    └── LabsShell
        ├── LabRegistry → 桌面侧边栏 / 移动端导航
        └── /labs 或 /labs/<slug> 页面内容
```

- 根 Layout 只提供全局文档骨架；Home 与 Labs 不共享业务 Layout。
- Home 是无侧边栏的独立入口页，Labs 入口跳转到 `/labs` 工作区。
- `app/labs/layout.tsx` 只包裹 Labs 路由，提供模块导航和内容容器。
- `app/` 只承担路由与页面组合。
- 后续 Lab 的实现放在 `src/labs/<slug>/`，每个 Lab 可独立拥有核心逻辑、适配器、状态和测试。
- `config/lab-registry.ts` 是模块元数据和导航的单一数据源。
- `components/ui/` 保存 shadcn 公共组件；平台布局与实验实现不得写入该目录。
- 请求状态使用显式判别联合建模，覆盖 Loading、Success 和 Error。
- Zustand 只管理确有跨组件需求的客户端状态；Foundation 首版仅保存侧边栏状态。

## Server 数据流

```text
GET /api/health
  └── HealthController
        └── HealthService
              ├── PrismaService.ping() → SELECT 1
              └── RedisService.ping()  → PING
```

两个依赖探测并行执行。全部可用时返回 HTTP 200；任一不可用时返回结构化降级结果和 HTTP 503。响应不会暴露连接地址、凭据或底层异常。

## MySQL 与 Redis

- MySQL 使用独立数据库 `frontend_study`，Prisma 7 通过 MariaDB Driver Adapter 建立连接。
- Foundation 不包含业务 Model、Migration 或 Seed，只允许无副作用的 `SELECT 1`。
- Redis 使用官方 node-redis、逻辑 DB 1 和 RESP2，以兼容当前远程实例。
- node-redis 自动为普通 key 添加 `frontend-study:` 前缀；扫描模式必须通过前缀辅助方法构造。
- Foundation 只执行 `PING`，不写入或清理任何 key。

## 配置与密钥

- 本地后端配置读取 `apps/server/env/.env.dev`。
- `.env.dev` 被 Git 忽略并使用仅当前用户可读写的文件权限。
- `.env.example` 只保存变量结构。
- Zod 在应用启动前校验数据库名、Redis DB 和 key 前缀，禁止静默回退到其他命名空间。
- CI 使用 GitHub Actions 临时 MySQL 与 Redis Service Container，不依赖远程凭据。

## 质量门禁

- Prettier：格式一致性。
- ESLint：共享规则加 Web/Server 差异化规则。
- TypeScript：严格模式与跨包类型检查。
- Vitest：配置、Store、Service、Controller 和 UI 请求状态。
- MSW：前端请求成功与失败重试。
- Playwright：真实浏览器验证 Home/Labs 布局边界、健康状态和侧边栏交互。
- Knip：未使用文件与依赖。
- Husky：提交前格式修复、类型检查、单元测试和文件长度检查。

## 已验证结果

- MySQL 远程连接成功，`SELECT 1` 返回正常。
- Redis DB 1 连接成功，`PING` 返回正常。
- Next.js 代理、首页、Swagger、favicon 和浏览器交互正常。
- 完整格式、Lint、类型、单元测试、生产构建与 Knip 检查通过。
