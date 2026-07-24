# Web Structure Governance Spec

## Intent

统一 `apps/web` 的组件目录和前端文件命名，移除从 NestJS 后端沿用到前端的不必要层级后缀，让组件、测试、Store、
Service 和文档结构保持可预测、可扩展并便于重构。

## Scope

- `apps/web/src/home/components/` 下的 Home 页面私有组件。
- `apps/web/src/components/` 下的 Markdown 组件和 shadcn UI 组件。
- `apps/web/src/labs/*/components/` 下的 Lab 私有组件。
- `apps/web/src/labs/*/store/` 下的 Zustand Store。
- `apps/web/src/services/` 下的前端业务 Service。
- 受目录迁移影响的测试、导入路径、架构文档和技术文档。

不修改后端 NestJS 命名，不修改 API、数据库、Redis、AG-UI 协议或页面交互行为。

## Naming Rules

### React 组件

普通 React 组件必须使用同名 kebab-case 目录，并将实现放在小写 `index.tsx`：

```text
health-panel/
├── index.tsx
└── __tests__/
    └── health-panel.spec.tsx
```

选择小写 `index.tsx` 是为了遵守仓库“文件和目录统一使用 kebab-case”的规则，并使用 TypeScript/Next.js 默认目录解析。

以下文件属于框架或测试约定，不迁移为组件目录：

- Next.js App Router：`page.tsx`、`layout.tsx`、`error.tsx`、`global-error.tsx`、`not-found.tsx`。
- 测试文件：`*.spec.ts`、`*.spec.tsx`。

### 前端逻辑文件

前端不使用 NestJS 的 `<feature>.<layer>.ts` 命名：

```text
store/thread.store.ts       → store/thread.ts
store/runtime.store.ts      → store/runtime.ts
services/health.service.ts  → services/health.ts
services/threads.service.ts → services/threads.ts
services/agent-stream.service.ts → services/agent-stream.ts
```

`base-request.ts`、`base-sse.ts`、`use-agent-stream-lab.ts` 等以 kebab-case 表达职责的文件保持不变；后端
`*.controller.ts`、`*.service.ts`、`*.module.ts` 继续遵守 NestJS 规范。

## Current Audit

- 21 个普通 React 组件仍使用扁平 `xxx.tsx`。
- 3 个前端 Service 使用 `*.service.ts`。
- 2 个 Zustand Store 使用 `*.store.ts`。
- 2 个组件测试需要迁入对应组件目录。
- 1 个普通渲染组件 `LabFallback` 未显式声明为 `FC`。
- Agent Stream Recovery 技术文档中的 Web 目录树与当前代码不一致。
- 未发现 `any`、组件内直接 `fetch`、内联样式、硬编码设计颜色、无 Selector 的 Zustand 读取或普通组件默认导出。
- JSX 中未发现三目条件渲染；Fault Controls 的三目表达式只用于事件数据构造。

## Constraints

1. 保留所有 Next.js 强制文件名和 URL。
2. 保留公共组件与 Lab 私有组件边界，不引入跨 Lab 业务依赖。
3. Store 和 Service 只重命名文件，不改变导出名称、状态模型或请求行为。
4. 导入方继续使用无扩展名目录导入，不增加跨层 Barrel。
5. 不修改后端文件命名。
6. 不操作远程数据库或 Redis，不启动或停止用户的开发服务。
7. 保留当前工作树中所有未提交功能改动。

## Acceptance Criteria

1. 除 App Router 和测试约定文件外，`apps/web/src` 不存在扁平普通组件 `xxx.tsx`。
2. 每个普通组件均位于同名 kebab-case 目录的 `index.tsx`。
3. 组件测试位于对应组件目录的 `__tests__/`。
4. 前端源码不再存在 `*.store.ts` 或 `*.service.ts`。
5. 所有导入路径完成迁移，不依赖临时兼容文件或重复导出。
6. Next.js 特殊文件名和所有现有页面 URL 保持不变。
7. 普通组件使用命名导出和 `FC<Props>`；框架文件继续使用默认导出。
8. 前端仍不存在 `any`、组件内直接 `fetch`、内联样式、硬编码设计颜色、JSX 三目条件渲染和无 Selector Store 读取。
9. Web 架构文档、Agent Lab 技术文档和治理验证记录与真实目录一致。
10. Format、Lint、Type Check、Unit Test、Build、Knip 和 Playwright E2E 全部通过。
