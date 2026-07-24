# Web Structure Governance Technical Design

## 1. Design

本次治理只改变源码物理位置和前端文件名，不改变模块边界、导出名称、URL、运行态或 API。

组件使用目录入口：

```text
<scope>/<component>/
├── index.tsx
└── __tests__/
    └── <component>.spec.tsx
```

调用方继续使用稳定的无扩展名导入：

```ts
import { HealthPanel } from '@/home/components/health-panel';
```

TypeScript 解析到 `health-panel/index.tsx`。不增加父级 Barrel，避免公共目录重新形成隐式依赖面。

## 2. Component Migration

### Home Page Components

```text
home/components/
├── health-card/index.tsx
├── health-panel/
│   ├── index.tsx
│   └── __tests__/health-panel.spec.tsx
├── home-header/index.tsx
├── home-page/index.tsx
└── labs-entry-card/index.tsx
```

### Public Markdown Component

```text
components/markdown/
└── markdown-renderer/
    ├── index.tsx
    └── __tests__/markdown-renderer.spec.tsx
```

### shadcn UI Components

```text
components/ui/
├── badge/index.tsx
├── button/index.tsx
├── card/index.tsx
├── input/index.tsx
├── scroll-area/index.tsx
├── sheet/index.tsx
├── skeleton/index.tsx
├── tabs/index.tsx
└── textarea/index.tsx
```

### Agent Stream Recovery Components

```text
labs/agent-stream-recovery/components/
├── agent-stream-recovery-lab/index.tsx
├── connection-inspector/index.tsx
├── event-log/index.tsx
├── fault-controls/index.tsx
├── message-list/index.tsx
├── prompt-composer/index.tsx
└── thread-history/index.tsx
```

## 3. Logic File Migration

```text
services/agent-stream.service.ts → services/agent-stream.ts
services/health.service.ts       → services/health.ts
services/threads.service.ts      → services/threads.ts

labs/agent-stream-recovery/store/runtime.store.ts → store/runtime.ts
labs/agent-stream-recovery/store/thread.store.ts  → store/thread.ts
```

后端 `*.service.ts`、`*.controller.ts`、`*.module.ts` 不在本次范围。

## 4. Framework Exceptions

以下是稳定的外部约定，保持扁平文件：

- Next.js：`page.tsx`、`layout.tsx`、`error.tsx`、`global-error.tsx`、`not-found.tsx`。
- Vitest/Playwright：`*.spec.ts`、`*.spec.tsx`。
- 配置：`*.config.ts`、`*.config.mjs`。

App Router 文件中的局部普通组件仍遵守 React 声明规则；`LabFallback` 改为显式 `FC`。

## 5. Validation

结构检查：

1. 枚举 `apps/web/src` 下所有 `*.tsx`。
2. 排除 App Router 特殊文件和 `*.spec.tsx`。
3. 其余文件名必须为 `index.tsx`，且父目录名使用 kebab-case。
4. 前端源码不得匹配 `*.store.ts` 或 `*.service.ts`。
5. 前端源码的其他文件和目录同样必须使用 kebab-case；`__tests__` 和 App Router Route Group 除外。
6. 搜索旧导入路径和旧文档引用，结果必须为空；后端 NestJS 引用除外。

工程检查：

```text
format-check → lint → type-check → unit → build → knip → Playwright E2E
```

## 6. Tasks

- [x] 迁移公共 Home、Markdown 和 UI 组件。
- [x] 迁移 Agent Lab 私有组件。
- [x] 迁移组件测试。
- [x] 重命名三个前端 Service 和两个 Store。
- [x] 更新全部导入路径。
- [x] 修复 `LabFallback` 的组件类型。
- [x] 更新 Web 架构和 Agent Lab 目录文档。
- [x] 增加 `check:structure` 并接入根级自检与 CI。
- [x] 执行结构扫描和完整工程验证。
