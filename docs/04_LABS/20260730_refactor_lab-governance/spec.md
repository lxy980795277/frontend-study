# Frontend Lab Code Governance · Spec

## Intent

对 `apps/web/src/` 进行一次结构性代码治理，先修正当前大数据表格 Lab 暴露出的函数风格、注释、过度防御、组件层级、
命名和类型归属问题，再把同一规则应用到现有全部 Lab，避免下一次开发继续产生相同问题。

治理只调整代码组织和表达方式，不改变产品功能、视觉结果、Worker 协议语义、Benchmark 口径、API、数据库或 Redis
行为。

## Current Audit

- `apps/web/src/` 当前存在 179 个 `function` / `export function` / `export default function` 声明。
- `agent-stream-recovery`、`markdown-stream-rendering`、`large-data-grid` 分别存在 0、90、77 个函数声明。
- 三个 Lab 均没有统一的根级 `types/`；非组件 Props 类型分散在 Core、Hook、Store、Benchmark、Metrics、Worker 和
  Browser 文件中。
- 三个 Lab 的 `components/` 根目录分别平铺 7、18、14 个组件目录，没有表达页面、工作台、Benchmark、Renderer 与
  Overlay 的父子关系。
- 非测试源码中，无注释文件分别为 12/13、43/51、27/43；大数据表格的滚动分段、Worker 生命周期、查询调度和
  Benchmark 完成点缺少必要的设计意图说明。
- 大数据表格存在可证明不可能为空却使用默认值的表达、已由循环边界保证却重复检查的分支，以及 2 处违反现有规范的
  JSX 三目表达式。
- 当前未发现 `any`，单文件均未超过 1000 行；Format、Lint、Type Check、Unit、Build 和 Knip 在治理前基线可通过。

## Scope

### Project-wide frontend rules

- `apps/web/src/**/*.{ts,tsx}` 不使用函数声明；命名函数、导出函数、Hook、工具函数和 Next Route Component 均使用
  `const name = (...) => {}`，默认导出使用“先声明常量，再 `export default`”。
- Class 和对象的运行时方法改为箭头属性；仅保留 JavaScript 语法无法替代的 `constructor`。接口中的函数签名继续
  作为类型声明，不制造运行时代码。
- 箭头函数必须使用函数体并显式 `return`，不保留隐式返回。
- 增加 ESLint 或结构检查，阻止函数声明和隐式返回重新进入前端源码。

### All Labs

- `agent-stream-recovery`、`markdown-stream-rendering`、`large-data-grid` 各自建立根级 `types/`。
- 除组件 Props 外，业务类型、状态类型、协议类型、Hook Controller 类型、Benchmark 类型和 Worker 类型迁入对应
  Lab 的 `types/`，按领域拆分文件，禁止单个巨型 `types.ts`。
- `components/index.tsx` 作为 Lab 组件入口，Chat、Inspector、Compare、Benchmark、Workbench、Renderer 和
  Overlay 等目录直接按真实拥有关系组织；禁止增加重复表达 Lab 上下文的 `components/lab/`。
- 只有被多个父级复用的组件保留在共同父级目录。
- 精简重复 Lab 前缀、`grid-` 前缀和过长目录名，组件名仍保持清晰、唯一、可搜索。
- 审计三个 Lab 的字段默认值、空值检查、类型守卫和重复状态判断，删除能够由类型、构造过程、循环边界或上游状态
  证明冗余的分支。
- 为三个 Lab 的关键算法、异步边界、失败恢复和资源生命周期增加解释设计原因的注释，不给普通 JSX 和直接赋值添加
  形式化注释。

### Large Data Grid cleanup

- 拆分过长的 Viewport、Workbench Hook 和 Benchmark Hook，降低单文件认知负担。
- 删除由数组构造、循环边界、受控状态或内部协议已经保证的不必要空值检查、默认值和类型兜底。
- 保留真正的边界校验：用户输入、Worker 消息边界、异步 Session/Version、浏览器能力、Canvas Context、滚动范围、
  查询取消、复制安全上限和资源释放。
- 为分段滚动、Latest-Wins、OffscreenCanvas 转移后降级、查询投影、稳定 ID 选择和 Benchmark 完成点添加解释“为什么”
  的注释；不注释显而易见的 JSX、赋值和事件转发。

## Constraints

- 不改变已确认的 1,000,000 × 100 默认规模和三种 Renderer 行为。
- 不弱化 Worker 失败降级、过期消息隔离、复制上限、XSS 防护和无障碍边界。
- 不为目录迁移保留兼容导出、转发文件、旧目录或重复类型。
- 组件 Props 继续与组件同文件维护。
- 类型目录只能声明类型，不承载运行时代码。
- 保持依赖方向：Component / Hook → Core / Browser / Renderer；Worker 不依赖 React 或 DOM。
- 当前大数据表格功能尚未提交和验收，治理继续在 `feat/large-data-grid` 工作树内完成，不提前 Commit 或 Push。

## Acceptance Criteria

1. `apps/web/src/**/*.{ts,tsx}` 中不存在函数声明或运行时 Method Declaration；`constructor` 是唯一语法例外。
2. 前端箭头函数全部使用块级函数体和显式返回；当前 82 个隐式返回和 73 个运行时方法完成迁移。
3. ESLint 或 `check:structure` 能在函数声明、隐式返回、错误组件层级或错误类型归属出现时失败。
4. 每个 Lab 都有领域化的根级 `types/`，组件 Props 以外的类型不再散落在实现文件。
5. 每个 Lab 直接提供 `components/index.tsx`，且组件路径能看出页面、工作台、Benchmark、Renderer、Overlay
   等父子关系。
6. 删除 `components/lab/`、过长和重复前缀命名，不保留兼容目录或转发导出。
7. 大数据表格中可证明冗余的字段、类型和逻辑兜底被移除；外部边界与安全校验保留并有理由说明。
8. 关键算法、异步边界和资源生命周期具有必要注释，普通展示代码不堆砌无信息注释。
9. 现有 `any` 数量保持为 0，JSX 三目表达式数量为 0，单文件不超过 1000 行。
10. 三个 Lab 的路由、交互、Loading/Error/Empty/Fallback、响应式、可访问性和 Benchmark 行为不变。
11. Structure、Format、Lint、Type Check、Unit、Build、Knip 与全部相关 Playwright 测试通过。

## Out of Scope

- 修改后端、API、Prisma、MySQL 或 Redis。
- 改变页面视觉设计或产品交互。
- 提取跨 Lab 公共业务 Package。
- 新增功能、表格编辑能力或新的 Renderer。
- 在本轮治理中提交或推送代码。

## UseCase

### UC-01 · 新增前端函数

**操作**

开发者在 `apps/web/src/` 新增函数声明、Class Method、Object Method、Function Expression 或隐式返回箭头函数。

**预期**

- ESLint 或 Structure Check 在本地直接失败。
- 错误信息指出必须使用具有块级函数体和显式返回的箭头函数。
- `constructor` 和纯类型函数签名不被误报。

### UC-02 · 定位 Lab 类型

**操作**

开发者查找一个非组件 Props 的状态、协议、Controller、Benchmark 或 Renderer 类型。

**预期**

- 类型只能位于对应 Lab 的根级 `types/`，并按领域文件定位。
- Runtime 文件不再混合声明公共业务类型。
- 组件 Props 仍与组件共置，不需要跨目录跳转。

### UC-03 · 理解组件拥有关系

**操作**

开发者从 Lab 入口追踪 Workbench、Benchmark、Renderer、Overlay 或 Inspector 的子组件。

**预期**

- 目录路径直接表达父子关系。
- 被两个父级共享的组件位于共同父级下，不复制实现。
- `components/` 根目录不再平铺十几个同级业务组件。

### UC-04 · 审查防御逻辑

**操作**

开发者审查内部数组访问、循环、受控状态、Worker 消息、用户输入和浏览器能力判断。

**预期**

- 能由内部不变量证明的空值判断和默认值被删除。
- 外部输入、异步消息、浏览器能力、安全上限和资源生命周期边界保留校验。
- 不使用新的 `try/catch`、默认字段、宽泛类型守卫或重复状态分支掩盖错误。

### UC-05 · 验证治理没有改变行为

**操作**

用户打开三个 Lab，执行原有主流程、异常流程、响应式和 Benchmark 流程。

**预期**

- 页面、交互、API、Store、Worker、Renderer 和 Benchmark 结果语义不变。
- 现有 Unit 与 Playwright 测试继续通过。
- Console 不出现 Error 或 React Warning。

## Tasks

- [x] T-01 更新前端约束、ESLint 与 Structure Check，禁止函数声明、运行时方法、Function Expression 和隐式返回。
- [x] T-02 将 `apps/web/src/` 全部运行时函数迁移为块级箭头函数，并补充治理扫描测试。
- [x] T-03 为 Agent Stream Recovery 建立领域化 `types/`，迁移非 Props 类型并重组组件父子目录。
- [x] T-04 为 Markdown Stream Rendering 建立领域化 `types/`，迁移非 Props 类型并重组 Compare/Benchmark/Renderer。
- [x] T-05 为 Large Data Grid 建立领域化 `types/`，迁移 Grid/Worker/Benchmark/Metrics/Controller 类型。
- [x] T-06 重组 Large Data Grid 的 Lab/Workbench/Benchmark/Grid/Renderer/Overlay 组件层级并精简命名。
- [x] T-07 拆分 Large Data Grid 的 Viewport、Workbench Hook 和 Benchmark Hook，保持状态与数据流不变。
- [x] T-08 审计三个 Lab 的冗余兜底并删除可证明无效的分支，保留外部边界与安全检查。
- [x] T-09 为三个 Lab 的关键算法、异步协议和资源生命周期补充必要注释。
- [x] T-10 更新架构、设计、治理规则和技术决策文档，不保留兼容文件或转发导出。
- [x] T-11 更新所有受路径影响的 Unit、Component、Playwright 测试并执行完整自测。
