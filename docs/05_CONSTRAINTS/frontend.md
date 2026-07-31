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
- 所有运行时函数统一使用箭头函数；禁止 Function Declaration、Function Expression、Class Method 和 Object
  Method，`constructor` 是唯一语法例外。
- 箭头函数必须包含块级函数体和显式 `return`，禁止隐式返回。
- Next.js 特殊文件先用常量声明箭头组件，再执行 `export default`。
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
- 每个 Lab 必须建立根级 `types/`，除组件 Props 外的 Interface、Type Alias 和 Enum 按领域放入该目录。
- 每个 Lab 使用 `components/index.tsx` 作为组件入口；禁止再增加语义重复的 `components/lab/` 包装层。
- Lab 的 `components/` 必须通过父子目录表达页面、工作区、Renderer、Overlay 等拥有关系，禁止将所有组件拍平为
  一级目录。
- 组件路径已有明确上下文时删除重复 Lab 名、业务名和技术前缀，避免超长目录名。
- 所有结构调整必须通过 `pnpm check:structure`。

## 注释与内部不变量

- 关键算法、异步协议、恢复策略和资源生命周期必须注释“为什么这样设计”，不能只复述代码。
- 普通 JSX、直接赋值、事件转发和由命名即可表达的逻辑不添加形式化注释。
- 由循环边界、构造过程、判别联合或受控 State 已保证的内部不变量，禁止再增加默认值、空值分支或宽泛类型守卫。
- 用户输入、网络、Worker 消息、浏览器能力、安全上限和 Mount/Unmount 生命周期属于真实边界，必须保留校验。
- 禁止用静默吞错、默认字段或扩大 `unknown` 转换掩盖内部错误；内部不变量被破坏时应直接暴露问题。

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
