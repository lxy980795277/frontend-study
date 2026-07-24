# 前端编码规范

## TypeScript

- 禁止使用 `any`。
- 函数参数和返回值必须明确。
- API 类型优先使用 `@frontend-study/shared-types`。
- 仅类型导入使用 `import type`。

## React

- 组件使用函数组件与 `FC<Props>`。
- 普通组件统一使用命名导出。
- Next.js `page.tsx`、`layout.tsx` 等框架文件允许默认导出。
- 箭头函数必须包含函数体和显式 `return`。
- 复杂渲染拆分子组件，业务逻辑拆分 Hook。
- 派生数据不写入 State，不使用 Effect 同步可计算状态。
- App Router 默认使用 Server Component。
- Client Component 必须声明 `'use client'`。

## 目录与文件命名

- 普通 React 组件必须使用同名 kebab-case 目录，实现文件固定为小写 `index.tsx`。
- 组件测试放在组件目录内的 `__tests__/`，使用 `*.spec.tsx`。
- Next.js App Router 的 `page.tsx`、`layout.tsx`、`error.tsx`、`global-error.tsx` 和 `not-found.tsx` 保持
  框架约定，不迁移为目录入口。
- 前端 Service 和 Store 直接使用职责名，例如 `services/threads.ts`、`store/thread.ts`。
- 禁止在前端使用 NestJS 风格的 `*.service.ts` 和 `*.store.ts`。
- 禁止为规避目录迁移保留兼容文件或重复导出；导入方直接引用组件目录。
- 所有结构调整必须通过 `pnpm check:structure`。

## 条件渲染

- JSX 禁止三目表达式。
- 简单条件使用 `&&`。
- 多状态文本、样式和图标使用映射对象。
- 复杂条件提前计算或拆分组件。

## Zustand

- 必须使用 Selector 读取 State 和 Action。
- 禁止 `useXxxStore()` 无参调用。
- 禁止组件内调用 `useXxxStore.getState()`。
- 仅跨组件且确有共享需求的客户端状态进入 Store。

## UI 与样式

- 公共 UI 优先使用 `components/ui/` 下的 shadcn 组件。
- 图标统一使用 `lucide-react`。
- 禁止内联样式。
- 优先 Tailwind CSS，其次 CSS 变量。
- 颜色必须使用语义 Token，禁止在业务组件硬编码颜色。
- 交互元素必须具备可访问名称、键盘能力和 Focus 样式。

## API

- 统一通过 `services/` 发起请求。
- 默认使用原生 `fetch`。
- Service 负责状态码检查和响应类型，组件不拼接基础 URL。
- Loading、Error、Empty 必须明确呈现。
