# Frontend Lab Code Governance · Technical Design

## 1. 治理边界

本次治理分为两层：

```text
apps/web/src
└── 函数语法统一 + 自动检查

apps/web/src/labs
├── agent-stream-recovery
├── markdown-stream-rendering
└── large-data-grid
    └── 类型归位 + 组件层级 + 命名精简 + 注释 + 冗余兜底清理
```

治理不改变运行时数据流，只改变声明方式、物理路径和可证明冗余的内部逻辑。Route、API、Store Action、Worker 消息字段、
Renderer Contract、Benchmark 输入与 UI Props 的外部行为保持不变。

## 2. 函数风格自动治理

### 2.1 ESLint

`@frontend-study/eslint-config/next` 增加：

```text
func-style: expression
prefer-arrow-callback
arrow-body-style: always
no-restricted-syntax:
  - Property[method=true]
```

迁移规则：

```ts
// before
export function calculate(input: Input): Output {
  return result;
}

// after
export const calculate = (input: Input): Output => {
  return result;
};
```

Next.js 特殊文件先声明箭头组件再默认导出：

```ts
const Page: FC = () => {
  return <Screen />;
};

export default Page;
```

Class 的运行时 Method 使用实例箭头属性，`constructor` 保持语言原生语法。接口和 Type Alias 只描述类型，不产生
运行时代码；接口方法统一优先写成函数属性签名。

### 2.2 Structure Check

`apps/web/scripts/check-structure.mjs` 使用 TypeScript AST 增加第二道检查：

- `FunctionDeclaration`、`FunctionExpression` 数量必须为 0。
- Runtime `MethodDeclaration` 数量必须为 0，`ConstructorDeclaration` 允许。
- `ArrowFunction.body` 必须是 `Block`。
- 每个 Lab 必须存在根级 `types/`。
- Lab 内除组件 `*Props` 外的 Interface、Type Alias 和 Enum 只能位于 `types/`。
- 每个 Lab 必须直接提供 `components/index.tsx`，并拒绝重复的 `components/lab/` 包装层。

ESLint 负责编辑反馈，Structure Check 负责仓库级不变量。两者都提供具体文件和行号。

## 3. 类型目录

### 3.1 Agent Stream Recovery

```text
agent-stream-recovery/types/
├── conversation.ts   # ChatMessageView / ToolCallView / ProtocolLogEntry / Projection
├── runtime.ts        # ConnectionPhase / RuntimeState / RuntimeEntry / RecoveryDecision / ActiveConnection
└── store.ts          # ThreadStore / RuntimeStore state 与 actions
```

来自 `@frontend-study/shared-types` 的 API DTO 不重复声明或搬入 Lab。

### 3.2 Markdown Stream Rendering

```text
markdown-stream-rendering/types/
├── markdown.ts       # Block / Snapshot / Diff / Patch
├── renderer.ts       # Runtime / Metrics / Commit / Worker Protocol
├── benchmark.ts      # Plan / Execution / Report / Environment
├── controller.ts     # Hooks 暴露的 state / actions / baseline
├── fixture.ts        # Fixture / stream configuration
└── browser.ts        # long-task monitor
```

### 3.3 Large Data Grid

```text
large-data-grid/types/
├── grid.ts           # Scenario / Column / Viewport / Query / Selection / Runtime
├── data.ts           # DataSource / comparable value
├── renderer.ts       # Frame snapshot / renderer contract / canvas context
├── scroll.ts         # scroll state / update
├── worker.ts         # request / response / runtime envelope
├── benchmark.ts      # configuration / plan / result / report
├── controller.ts     # workbench 与 benchmark model/actions
└── metrics.ts        # live metrics / accumulator
```

类型文件只包含类型导入和类型声明。组件 Props 保留在组件文件；只被单个组件使用的展示状态也作为 Props 或组件内部值，
不提升为 Lab 业务类型。

## 4. 组件目录

### 4.1 Agent Stream Recovery

```text
components/
├── index.tsx
├── history/
│   └── index.tsx
├── chat/
│   ├── index.tsx
│   ├── messages/
│   │   └── index.tsx
│   └── composer/
│       └── index.tsx
└── inspector/
    ├── index.tsx
    ├── connection/
    │   └── index.tsx
    ├── events/
    │   └── index.tsx
    └── faults/
        └── index.tsx
```

### 4.2 Markdown Stream Rendering

```text
components/
├── index.tsx
├── renderers/
│   ├── incremental/index.tsx
│   ├── legacy/index.tsx
│   ├── viewport/index.tsx
│   └── tools/index.tsx
├── compare/
│   ├── index.tsx
│   ├── controls/index.tsx
│   ├── status/index.tsx
│   ├── pane/index.tsx
│   └── inspector/
│       ├── index.tsx
│       ├── metrics/index.tsx
│       ├── patches/index.tsx
│       └── runtime/index.tsx
└── benchmark/
    ├── index.tsx
    ├── config/index.tsx
    ├── status/index.tsx
    ├── workspace/
    │   ├── index.tsx
    │   └── host/index.tsx
    └── report/index.tsx
```

Compare 与 Benchmark 共用的 Renderer 放在共同父级 `renderers/`，不保留 `single-renderer-host`、
`markdown-stream-rendering-lab` 等重复上下文名称。

### 4.3 Large Data Grid

```text
components/
├── index.tsx
├── grid/
│   ├── index.tsx
│   ├── renderers/
│   │   ├── canvas/index.tsx
│   │   └── dom/index.tsx
│   └── overlays/
│       ├── a11y/index.tsx
│       ├── resize/index.tsx
│       └── selection/index.tsx
├── workbench/
│   ├── index.tsx
│   ├── controls/index.tsx
│   ├── status/index.tsx
│   └── metrics/index.tsx
└── benchmark/
    ├── index.tsx
    ├── config/index.tsx
    ├── host/index.tsx
    └── report/index.tsx
```

`Grid` 被 Workbench 与 Benchmark 共用，因此放在二者共同父级。目录上下文已经表达 Grid，不再重复
`grid-column-resize-overlay`、`canvas-grid-renderer` 等前缀。

## 5. 过度防御清理

### 5.1 删除

- 固定非空常量数组使用取模索引后仍提供默认枚举值。
- `for` / Slice / Iterator 已保证范围后重复检查 Column、Row 或 Execution 是否存在。
- TypedArray 合并和前缀算法中已由游标边界保证的 `?? 0`。
- 已由受控 State、Discriminated Union 或调用顺序保证的重复默认字段。
- 同一调用链多层重复执行的 Normalize、Clamp 或 Empty Check。
- 为安抚类型系统而扩大运行时分支、宽泛转换 `unknown` 或静默吞错。

内部不变量通过循环结构、迭代器、判别联合和精确类型表达；无法被 TypeScript 推导但数学上已证明的索引，可在最小范围
使用非空断言，不新增运行时兜底。

### 5.2 保留

- URL、表单、剪贴板等用户输入边界。
- `postMessage` 收到的 `unknown` Worker 消息协议校验。
- Renderer/Session/Request/Query/Frame Version 的过期消息隔离。
- Canvas Context、Worker、OffscreenCanvas、PerformanceObserver 等浏览器能力结果。
- React Ref 在 Mount/Unmount 边界的空值判断。
- Empty Query Result、零行、首帧未完成等真实产品状态。
- 复制字节/单元格上限、HTML Sanitization 和文本转义。
- Dispose 后忽略回调、取消 RAF/Timer/Observer/Listener 的生命周期检查。

Worker Fallback 是明确产品能力，不属于需要删除的“逻辑兜底”。

## 6. 注释策略

注释只解释代码无法直接表达的原因、约束和生命周期：

- Agent：SSE Cursor 恢复、重复事件去重、旧 Run 隔离、Abort/Stop 时序。
- Markdown：Block Diff 边界、Snapshot Fallback、Stick-to-bottom 状态、Benchmark Commit 完成点。
- Grid：分段滚动映射、稳定 Row ID、Query Projection、Latest-Wins、DPR 坐标、Canvas 转移后替换、Benchmark 隔离。

禁止以下注释：

- 复述变量名、赋值或 JSX 结构。
- `handle click`、`set loading` 等无信息文本。
- 用注释解释本应由类型、函数名或目录表达的结构。

## 7. 数据流与外部系统

### Agent Stream Recovery

```text
UI → useAgentStreamLab → services/threads + SSE → Zustand Stores
```

Service 请求、Store Selector/Action、SSE Cursor、Redis/MySQL 后端行为均不变；只迁移类型与组件路径。

### Markdown Stream Rendering

```text
Controls → Lab Hook → Worker Parse/Diff → Renderer Commit → Metrics/Benchmark
```

Worker 协议、Patch 结果、Renderer 实现和 Benchmark 完成点不变。

### Large Data Grid

```text
Controls → Workbench Hook → Grid Snapshot → DOM/Main Canvas/Worker → Metrics
```

数据规模、惰性数据、二维几何、查询投影、滚动模型和 Renderer Contract 不变。

本治理不新增或修改 Store、REST API、Service、Prisma、MySQL 与 Redis 行为。

## 8. 迁移顺序

1. 先增加规则与治理扫描，但以待修复清单方式运行。
2. 转换全前端函数语法，使 ESLint 新规则可正式启用。
3. 按 Agent → Markdown → Grid 顺序迁移类型和组件，每个 Lab 迁移后立即运行 Type Check 与对应测试。
4. 从 Grid Viewport 拆出 Renderer Layer 与导航几何，并将 Workbench / Benchmark Hook 的类型和运行时模型移入领域文件。
5. 补充关键注释和治理文档。
6. 删除所有旧路径，执行全量 Structure、Format、Lint、Type Check、Unit、Build、Knip 与 Playwright。

不创建兼容 Barrel 或旧路径转发；所有 Import 一次性指向最终目录。
