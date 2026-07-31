# Large Data Grid · Technical Design

## 1. 问题定义

本 Lab 默认验证 1,000,000 行 × 100 列，共 100,000,000 个逻辑单元格。目标不是证明浏览器可以创建一亿个 DOM
节点或一亿个 JavaScript 对象，而是建立以下不变量：

```text
逻辑数据规模
  ≠ 主线程物化数据
  ≠ 当前可见数据
  ≠ 实际挂载或绘制数据
```

渲染成本应主要由 Viewport、Overscan 和当前交互决定，而不是随总行列数线性增长。百万行会显著放大滚动高度、
索引投影、排序过滤、资源释放和可访问性问题，因此默认工作台、默认 Benchmark 和默认 E2E 都使用该规模；10 万行及
更小规模只作为开发调试档。

本方案吸收 `ola-sheet` 的 Canvas、Worker、原生滚动和 DOM Overlay 分工，但重新建立严格类型、生命周期、降级、
可访问性和可复现测量边界。首期交付是 Lab 内的纯 TypeScript Grid Engine + React Adapter，不注册 Custom Element。

## 2. 设计原则

1. **数据惰性**：单元格按 `seed + sourceRowIndex + columnIndex` 即时生成，默认负载不创建完整 `rows[][]`。
2. **二维裁剪**：所有 Renderer 使用同一份行列几何，只处理可见范围和有界 Overscan。
3. **渲染可替换**：DOM、Main Canvas、Worker Offscreen 实现同一个 Renderer Contract。
4. **Worker 闭环**：Offscreen 路径在 Worker 内完成数据读取、Query Projection、可见范围和绘制。
5. **状态与资源分离**：可恢复的逻辑状态独立于 Canvas、Worker、RAF、Observer 等一次性资源。
6. **Latest-Wins**：滚动、Resize 和 Query 只允许最新版本提交。
7. **可验证而非口号**：固定默认规模、数据、视口、轨迹、轮次和完成点，报告保留原始样本。
8. **渐进增强**：不支持 OffscreenCanvas 或运行时失败时恢复为 Main Canvas，交互不失效。
9. **有界语义**：Canvas 不复制百万行无障碍 DOM，只维护当前活动单元格及必要上下文。
10. **适配器优先**：核心不依赖 React；未来 Web Component 只是新的生命周期和属性 Adapter。

## 3. 系统边界与依赖方向

```text
Next Route / Lab Registry
          │
          ▼
React Lab Adapter
  ├── Workbench UI
  ├── Benchmark UI
  └── Grid React Host
          │ commands / snapshots
          ▼
Pure TypeScript Grid Controller
  ├── Logical State
  ├── Geometry + Scroll Model
  ├── Selection + Query Model
  ├── Frame Scheduler
  └── Renderer Contract
          │
          ├── DOM Virtual Renderer
          ├── Main Canvas Renderer
          └── Worker Offscreen Renderer ──► Dedicated Worker
```

依赖规则：

- `core/`、`fixtures/`、`benchmark/` 中的纯函数不得导入 React、Next.js、Zustand 或浏览器全局。
- `renderers/` 可以依赖浏览器 API 和 Core，不依赖 Lab React 组件。
- `worker/` 复用 Core 的数据、几何、查询和 Canvas Painter，不导入 DOM。
- `components/` 与 `hooks/` 只通过 Controller 和 Renderer Contract 驱动核心。
- 不建立跨 Lab 依赖；经过真实复用后再评估提取到 `packages/`。

## 4. 默认验证基线

```ts
interface DefaultGridScenario {
  rowCount: 1_000_000;
  columnCount: 100;
  logicalCellCount: 100_000_000;
  seed: 2_026_073_0;
  rowHeightCssPx: 28;
  defaultColumnWidthCssPx: 144;
  rowOverscan: 4;
  columnOverscan: 2;
  benchmarkRounds: 3;
}

const DEFAULT_BENCHMARK_VIEWPORT = {
  widthCssPx: 960,
  heightCssPx: 560,
};
```

- 工作台、Benchmark 和 Playwright 默认值统一从一个常量导出。
- 工作台 Viewport 不使用固定高度，通过 `minmax(0, 1fr)` 接收页面剩余空间，并由 `ResizeObserver` 把真实尺寸送入
  三种 Renderer；Benchmark Host 仍保持 960 × 560 固定尺寸，保证测量可比较。
- 窄屏时工作台真实视口可以小于 Benchmark 固定视口；Benchmark Host 在自身容器内展示。
- 开发调试可以选择 10,000 或 100,000 行，但报告必须记录配置，不能与默认结果合并。
- 数据初始化只创建 100 个列定义和常量级 Generator 状态。
- 无排序过滤时，显示索引直接映射到 Source Row Index，不创建百万行 Projection。

## 5. 目录设计

```text
apps/web/src/
├── app/labs/(detail)/large-data-grid/
│   └── page.tsx
├── config/
│   └── lab-registry.ts
└── labs/large-data-grid/
    ├── benchmark/
    │   ├── plan.ts
    │   ├── report.ts
    │   ├── statistics.ts
    │   ├── types.ts
    │   └── __tests__/
    ├── browser/
    │   ├── capability.ts
    │   ├── long-task-monitor.ts
    │   ├── query-worker-host.ts
    │   └── scroll-dimension-probe.ts
    ├── components/
    │   ├── benchmark-configuration/index.tsx
    │   ├── benchmark-report/index.tsx
    │   ├── canvas-grid-renderer/index.tsx
    │   ├── dom-virtual-grid/index.tsx
    │   ├── grid-accessibility-layer/index.tsx
    │   ├── grid-column-resize-overlay/index.tsx
    │   ├── grid-controls/index.tsx
    │   ├── grid-live-metrics/index.tsx
    │   ├── grid-selection-overlay/index.tsx
    │   ├── grid-status-bar/index.tsx
    │   ├── grid-viewport/index.tsx
    │   ├── isolated-benchmark/index.tsx
    │   ├── large-data-grid-lab/index.tsx
    │   └── workbench/index.tsx
    ├── core/
    │   ├── canvas-painter.ts
    │   ├── column-axis.ts
    │   ├── consistency.ts
    │   ├── data-source.ts
    │   ├── frame-scheduler.ts
    │   ├── grid-types.ts
    │   ├── query-engine.ts
    │   ├── renderer.ts
    │   ├── scroll-model.ts
    │   ├── selection.ts
    │   ├── viewport-range.ts
    │   └── __tests__/
    ├── fixtures/
    │   └── default-scenario.ts
    ├── hooks/
    │   ├── use-grid-workbench.ts
    │   └── use-isolated-benchmark.ts
    ├── metrics/
    │   ├── collector.ts
    │   └── types.ts
    ├── renderers/
    │   ├── main-canvas-renderer.ts
    │   └── worker-offscreen-renderer.ts
    └── worker/
        ├── grid-worker.ts
        ├── protocol.ts
        └── __tests__/
```

普通 React 组件继续使用同名 kebab-case 目录和 `index.tsx`，不增加父级 Barrel。路由只导入
`LargeDataGridLab`。

## 6. UI 布局树

```text
LargeDataGridLab
├── LabHeader
│   ├── Title / Purpose
│   └── DefaultScaleBadge (1,000,000 × 100)
│   └── ModeTabs (URL: workbench | benchmark)
├── Workbench [mode=workbench]
│   ├── GridControls
│   │   ├── CommonToolbar (Renderer / Query / Jump / Selection / Copy)
│   │   └── AdvancedControls [expanded]
│   │       ├── DataScale / ColumnCount / Overscan
│   │       ├── Sort
│   │       └── FaultInjection
│   ├── GridStatusBar
│   │   ├── RuntimeStatus
│   │   ├── Logical / Visible / Materialized / Drawn
│   │   ├── ActiveCell / Selection
│   │   └── Query / Fallback
│   ├── GridViewport
│   │   ├── NativeScrollHost
│   │   │   └── BoundedScrollPlane
│   │   ├── ActiveRendererLayer
│   │   ├── GridOverlays
│   │   └── GridAccessibilityLayer
│   └── LiveMetrics
└── IsolatedBenchmark [mode=benchmark]
    ├── BenchmarkConfiguration
    ├── BenchmarkActions
    ├── BenchmarkWorkspace
    │   ├── Progress
    │   ├── SingleRendererHost
    │   └── LiveMetrics
    └── BenchmarkReport
        ├── Environment
        ├── RendererSummary
        ├── Consistency
        ├── PerExecutionTable
        └── ExportJson
```

Lab 页面使用固定视口高度和 `overflow-hidden`；工作台以
`auto auto minmax(0, 1fr) auto` 分配操作栏、状态、Grid 和指标，Grid 始终获得全部剩余高度。常用操作栏默认
单行，高级配置按需展开并触发 Grid 自适应收缩；窄屏下工具栏与指标条局部横向滚动，Grid 保持独立横纵滚动。所有
Grid/Flex 子项使用 `min-w-0`、`min-h-0`，不让一亿逻辑单元格的尺寸传递到页面 Layout。

## 7. 数据模型

### 7.1 列定义

```ts
type GridCellKind = 'id' | 'integer' | 'decimal' | 'status' | 'text' | 'timestamp';

interface GridColumn {
  id: string;
  label: string;
  kind: GridCellKind;
  widthCssPx: number;
  minWidthCssPx: number;
  maxWidthCssPx: number;
  sortable: boolean;
  filterable: boolean;
}
```

100 列由固定 Schema 模板重复展开，但每列拥有稳定 Column ID。排序和过滤只对声明支持的列开放，避免 UI 暗示任意
富内容都可查询。

### 7.2 惰性数据源

```ts
interface GridDataSource {
  readonly rowCount: number;
  readonly columns: readonly GridColumn[];
  getRowId(sourceRowIndex: number): string;
  getCell(sourceRowIndex: number, columnIndex: number): GridCellValue;
  getSearchText(sourceRowIndex: number, columnIndex: number): string;
}
```

Generator 使用无状态整数 Hash 和固定 Seed。任意运行环境对同一坐标生成相同值：

```text
seed + sourceRowIndex + columnIndex
  → integer hash
  → typed value
  → shared formatter
  → visible text
```

不缓存完整行。可选的可见窗口缓存使用有界 LRU，Key 为 Row ID + Column ID + Query Version，Renderer Dispose
时释放。默认安全 Fixture 包含类似 HTML 的文本，所有 Renderer 都必须显示为文本。

### 7.3 行投影

```ts
type RowProjection =
  { kind: 'identity'; rowCount: number } | { kind: 'indexed'; sourceIndexes: Uint32Array; queryVersion: number };
```

- 无 Query 时使用 `identity`，内存为常量级。
- 排序或过滤后只保存 Source Row Index，不保存单元格对象。
- 百万行完整 Projection 为约 4 MB；稳定排序最多使用两个 `Uint32Array` 工作区，不创建百万个对象。
- Worker Offscreen 保留一份 Projection 用于绘制，同时通过 Transferable 向主线程交付独立的
  `Uint32Array`，用于统一的选择、键盘导航和 Renderer 切换。
- DOM/Main Canvas 使用独立 Query Worker 通过 Transferable 交付 Projection。主线程最多接收约 4 MB 行索引，
  不接收完整 Cell Matrix。
- 查询结果激活后，Viewport 额外建立一个约 4 MB 的 `Int32Array` 反向索引，把稳定 Row ID 到显示行的键盘导航从
  O(n) 降为 O(1)；无 Query 的默认百万行场景不创建该索引。

## 8. 几何与二维可见范围

### 8.1 行轴

首期固定行高：

```text
firstRow = floor(logicalScrollTop / rowHeight)
lastRow  = ceil((logicalScrollTop + viewportHeight) / rowHeight) - 1
```

结果再应用有界 Row Overscan，并 Clamp 到 Query Result Row Count。行号列和表头不计入数据列坐标。

### 8.2 列轴

100 个可变宽列使用 `Float64Array` 保存前缀和：

```text
prefix[0] = rowHeaderWidth
prefix[n + 1] = prefix[n] + column[n].width
```

左右可见列通过二分查找得到。调整某一列宽只重算其后的前缀，复杂度 O(columnCount)，默认 100 列时边界明确。

### 8.3 CSS 像素与 DPR

```ts
interface GridViewport {
  widthCssPx: number;
  heightCssPx: number;
  logicalScrollLeftCssPx: number;
  logicalScrollTopCssPx: number;
  devicePixelRatio: number;
}
```

- Viewport、命中测试、列宽、滚动和 Overlay 全部使用 CSS 像素。
- Canvas `width/height` Backing Store 使用 `cssSize × DPR`。
- Painter 在每次尺寸或 DPR 变化后重置 Transform，再按 CSS 坐标绘制。
- 不允许把 Backing Store 像素带入可见范围算法。

## 9. 受控滚动模型

百万行默认逻辑高度为 28,000,000 CSS px，接近或可能超过不同浏览器的稳定元素尺寸边界。启动时通过隐藏的
`ScrollDimensionProbe` 探测当前浏览器可读写的最大稳定尺寸，并保留安全余量。

```ts
type VerticalScrollMode =
  | { kind: 'direct'; physicalExtentCssPx: number }
  | {
      kind: 'segmented';
      physicalExtentCssPx: number;
      logicalBaseCssPx: number;
      physicalAnchorCssPx: number;
      guardBandCssPx: number;
    };
```

直接模式：

- 逻辑高度小于探测安全值时，`logicalScrollTop === physicalScrollTop`。

分段模式：

1. Native Scroll Plane 只使用安全的物理高度。
2. 逻辑位置由 `logicalBase + physicalTop - physicalAnchor` 计算。
3. 物理滚动进入上下 Guard Band 时，在同一调度周期把当前逻辑位置设为新 Base，并把物理位置重置到 Anchor。
4. 内部重定位带 Suppression Token，不产生第二次用户滚动提交。
5. 首尾区间单独 Clamp，保证第 1 行和第 1,000,000 行都可到达。
6. 快速跳转直接更新逻辑 Base 和物理 Anchor，不把 28,000,000 px 强塞给 DOM。

全局位置由行号、百分比和跳转控件表达。分段模式下原生滚动条代表当前物理窗口，UI 必须明确展示逻辑位置，不能把
局部 Thumb 误报为全表比例。

动态尺寸不通过 JSX `style` 对象表达。Canvas 使用元素尺寸属性，Scroll Plane 和 DOM Spacer 使用数值属性；
视觉颜色、边框、排版和布局仍全部来自 Tailwind 与语义 Token。

## 10. 共享逻辑状态

```ts
interface GridLogicalState {
  scenario: GridScenario;
  rendererKind: GridRendererKind;
  viewport: GridViewport;
  columnWidths: readonly GridColumnWidth[];
  query: GridQuery;
  queryVersion: number;
  projectionSummary: ProjectionSummary;
  activeCell: GridCellRef | null;
  selection: GridSelection | null;
  geometryVersion: number;
}

interface GridCellRef {
  rowId: string;
  columnId: string;
}
```

React Lab 使用局部 Hook 中的 `useState`、`useMemo` 和稳定 Action Callback 保存配置和可序列化逻辑状态；不使用
Zustand，因为首期没有跨页面或无共同父节点的共享需求。Viewport Range、像素矩形和可见 Cell 列表均为派生值，不复制
进 React State。

Canvas、Worker、RAF ID、Observer、Timer、Abort Handle 和等待中的 Promise Resolver 全部保存在 Runtime Host，
不得进入逻辑状态。切换 Renderer 时先 Dispose 旧 Runtime，再使用同一逻辑 Snapshot 建立新 Runtime。

## 11. Renderer Contract

```ts
interface GridRenderer {
  readonly kind: GridRendererKind;
  mount(context: GridRendererMountContext): void;
  update(snapshot: GridFrameSnapshot): void;
  dispose(): void;
}
```

Renderer 不直接修改 React State，通过强类型 Callback 报告：

- `ready`
- `frame-drawn`
- `error`

Query 与 Fallback 是 Worker Host/React Adapter 的职责。Worker Runtime 使用唯一 `rendererId + sessionId`，响应还携带
Request、Frame 和 Query Version；Dispose 后旧异步结果无法通过当前 Session 或最新版本校验。

## 12. 三种渲染路径

### 12.1 DOM Virtual

- 只渲染可见行和可见列及 Overscan。
- 原生 `div` Spacer 维持当前物理滚动窗口，不创建全量节点。
- Renderer Surface、表头、可见行和可见 Cell 都使用纯 HTML `div`；可见行按 Y 轴、Cell 按 X 轴使用
  `translate3d` 定位，不通过 SVG `foreignObject` 承载 Cell。
- SVG 只用于有界的选区和列宽交互 Overlay，不计入 DOM Cell 渲染基线。
- Cell Key 使用 Row ID + Column ID，不使用可见数组下标。
- 每次 React Commit 后由 Layout Effect 报告已提交 Range，再进入统一展示边界。
- 挂载节点数写入指标，必须与总行列数无关。

不引入第三方 Virtualizer。三种 Renderer 必须共享同一 Geometry，使用独立库会让“算法差异”和“渲染差异”混在一起。

### 12.2 Main Canvas

- Native Scroll Host 只负责输入和滚动条。
- 固定尺寸 Canvas 覆盖 Viewport，Painter 绘制表头、行号、可见 Cell、网格线和基础选择态。
- Scroll/Resize 进入 Main Frame Scheduler，同一帧只绘制最新 Snapshot。
- 活动框、拖拽列宽、Tooltip 和可访问性语义由有界 DOM/SVG Layer 提供。
- Canvas Context Lost 或创建失败进入可读 Error，不循环重试。

### 12.3 Worker Offscreen

初始化顺序：

```text
create HTMLCanvasElement
  → capability check
  → transferControlToOffscreen()
  → create Dedicated Worker
  → post init(canvas as Transferable)
  → worker create context/data/query/painter
  → ready
```

Worker 内保存：

- Deterministic Data Source。
- 当前 Query Projection。
- Geometry Snapshot。
- 最新待绘制 Viewport。
- OffscreenCanvas Context 和 Worker RAF。

主线程只发送最新逻辑状态和视口，不发送完整可见 Cell 文本。Worker Draw 完成后返回可见范围、活动 Cell
文本、内容摘要、Draw Duration、绘制 Cell 数和版本。

`transferControlToOffscreen()` 已经发生后，同一 HTML Canvas 不得再调用主线程 `getContext()`，也不能重新转移。
因此故障降级必须：

1. 标记旧 Session 失效。
2. 取消 Timeout 和 Listener。
3. 终止失效 Worker。
4. 递增 `canvasGeneration`，卸载已经转移的 Canvas。
5. 挂载全新的 HTML Canvas。
6. 用当前逻辑 Snapshot 建立 Main Canvas Renderer。

Fallback 报告保留原请求类型和失败原因，Benchmark 中的该次执行标记为 `fallback`，不计入 Worker Offscreen 汇总。

## 13. Frame Scheduler 与提交口径

### 13.1 Latest-Wins

```text
idle
  └── update → scheduled(latestSnapshot)

scheduled
  ├── more update → replace latestSnapshot
  └── RAF → drawing

drawing
  ├── newer update → pendingLatest
  └── draw finished → presentation-boundary

presentation-boundary
  ├── current version → committed
  └── stale version → discarded

committed
  └── pendingLatest ? scheduled : idle
```

- Main Thread 使用 `requestAnimationFrame`。
- Worker 优先使用 Dedicated Worker RAF；不可用时使用有界 Timer Fallback，并在 Capability 中记录。
- 单个 Runtime 同时最多一个已调度 Draw 和一个 Latest Pending Snapshot。
- Scroll Event 本身不读取单元格、不绘制、不写指标数组。

### 13.2 展示完成点

Canvas API 没有跨浏览器的“像素已出现在屏幕”回调。统一口径定义为：

```text
drawComplete
  → main thread receives/observes matching frame
  → next main requestAnimationFrame
  → presentationCommit proxy
```

`Scroll-to-Commit = presentationCommitAt - inputObservedAt`。该值代表浏览器已经到达下一次展示机会，不声称是 GPU
实际扫描输出时间。报告同时保留 Renderer 内部 Draw/DOM Commit 和端到端 Commit Latency，避免一个代理值掩盖差异。

## 14. Worker 协议

所有消息是严格判别联合类型，公共 Envelope 包含：

```ts
interface WorkerEnvelope {
  protocolVersion: 1;
  rendererId: string;
  sessionId: number;
  requestId: number;
}
```

Main → Worker：

- `init`：可选 Canvas Transferable、Scenario、Theme、列宽。
- `frame`：Frame ID、逻辑滚动、CSS 尺寸、DPR、可见范围与 Query Version。
- `query`：Query Version、Sort、Filter。
- `simulate-failure`：仅开发 Lab 的显式运行时故障。
- `dispose`：释放 Worker Runtime。

Worker → Main：

- `ready`
- `frame-drawn`
- `query-progress`
- `query-result`
- `runtime-error`
- `disposed`

校验顺序：

```text
protocolVersion
  → rendererId
  → sessionId
  → requestId / frameId / queryVersion
  → payload runtime guard
  → accept or discard
```

未知消息被 Runtime Guard 拒绝；`error`、`messageerror` 和初始化超时统一进入 Failure Policy。初始化上限为 3
秒。查询 Latest-Wins 通过 Query Version 和 Worker 销毁实现，不另设会误伤百万行排序的固定查询超时。

## 15. 排序与过滤

```ts
interface GridQuery {
  sort: {
    columnId: string;
    direction: 'ascending' | 'descending';
  } | null;
  filter: {
    text: string;
    columnIds: readonly string[];
  } | null;
}
```

- Filter 只扫描声明为 `filterable` 的指定列，不默认扫描全部 100 列。
- 查询以固定 Chunk 扫描百万行，每个 Chunk 后检查最新 Query Token 并让出 Worker Event Loop。
- Filter 输出紧凑 `Uint32Array` Source Index。
- Sort 使用稳定、确定性的索引排序；值相同时以 Source Row Index 作为最终 Tie Breaker。
- 查询过程中 Worker 定期报告已扫描行数和阶段，不传输中间完整 Projection。
- 新 Query 到达时旧 Query 标记取消；旧任务即使完成也不能提交。
- Empty 是 `query-result` 的合法结果，不进入 Error。

Renderer 性能 Benchmark 的固定滚动阶段不启用 Query，以隔离渲染差异。工作台单独显示查询进度、结果数量和摘要，
不把 Worker 计算时间伪装成 Canvas 绘制收益。

## 16. 交互、选择与复制

### 活动单元格

- Pointer 通过共享 Hit Test 将 CSS 坐标映射为可见 Row/Column。
- 键盘支持方向键、Page Up/Down、Home/End、Ctrl/Meta + Home/End。
- 移动后先更新稳定 Cell Ref，再调用 `ensureCellVisible()` 更新逻辑 Scroll。
- Renderer Commit 对应新位置后才更新“已显示活动单元格”状态。

### 范围选择

```ts
interface GridSelection {
  anchor: GridCellRef;
  focus: GridCellRef;
  queryVersion: number;
}
```

- Shift + 方向键扩展连续范围。
- 查询变化时通过 Row ID 重新定位 Anchor/Focus；已过滤掉的端点会清除范围并给出文本说明。
- 选择框由少量 Overlay 绘制，不为范围中的每个 Cell 创建节点。

### 复制

- 复制按当前 Query Order 生成 TSV。
- 默认上限同时限制 Cell 数和 UTF-8 估算字节数。
- 安全上限内在主线程按当前 Projection 惰性生成；超过 Cell 或 UTF-8 Byte 上限时，在生成无界字符串之前拒绝。
- 超限不截断后静默复制，明确提示用户缩小选择。
- Clipboard API 失败保留选区并提供可重试状态，不记录复制内容。

## 17. 可访问性

Grid Host：

- `role="grid"`
- `aria-label`
- `aria-readonly="true"`
- `aria-multiselectable="true"`
- `aria-rowcount="1000000"`
- `aria-colcount="100"`
- `aria-activedescendant`

三种 Renderer 共用一个有界语义镜像，DOM Renderer 的纯 HTML 可见节点同样只负责图形呈现并设置
`aria-hidden`，避免三条测量路径使用不同的无障碍节点数量：

```text
grid
└── row (active row, aria-rowindex)
    ├── rowheader
    └── gridcell (active cell, aria-colindex, stable id)
```

DOM Focus 始终保留在 Grid Host，`aria-activedescendant` 指向活动 Cell。活动 Row/Cell 必须是 Grid 拥有的后代，
不能只创建无父 Row 的孤立 `gridcell`。另有 `aria-live="polite"` 状态区播报 Query、Fallback、复制失败和活动位置，
快速滚动本身不逐帧播报。

可见 Focus、选区、排序方向和错误状态同时具有图形与文本表达。Canvas 路径提供的是有界活动单元格语义，不宣称
Screen Reader 可以一次浏览百万行 DOM；此限制在 Lab 说明中明确公开。

## 18. 数据流

### 18.1 工作台主流程

```text
Control / Pointer / Keyboard
  → React Adapter dispatch logical action
  → Grid Controller creates versioned snapshot
  → Scroll Model + Geometry derive visible range
  → Frame Scheduler coalesces to latest snapshot
  → Active Renderer draws or commits visible cells
  → presentationCommit proxy
  → Metrics + Runtime Status + Accessibility Snapshot
  → React UI renders bounded status
```

### 18.2 Query

```text
Sort / Filter Input
  → debounce only text input
  → queryVersion + 1
  → Worker chunked scan / stable index sort
  ├── stale token → discard
  └── current token → Projection + Summary
        → Controller restores Cell Refs
        → latest Viewport render
        → consistency digest
```

### 18.3 Worker Offscreen

```text
Main: latest viewport/state
  → typed postMessage
  → Worker validates Session/Version
  → Data Source + Projection + Geometry
  → visible cells only
  → OffscreenCanvas draw
  → frame-drawn(metadata)
  → Main validates current frame
  → presentationCommit proxy
```

### 18.4 Fallback

```text
capability/init/runtime failure
  → invalidate Session
  → terminate Worker
  → replace transferred Canvas
  → mount Main Canvas with logical snapshot
  → draw current Viewport
  → Fallback Ready + reason
```

## 19. Store、接口与基础设施

### Store

- 不新增全局 Zustand Store。
- Lab UI 使用局部 Hook State；Grid Core 使用框架无关 Snapshot 与纯函数。
- 浏览器资源只存在 Runtime Host，不进入可序列化 State。

### HTTP / Service

- 不新增 REST、SSE、WebSocket 或静态数据 Service。
- 默认数据在浏览器中由固定 Seed 惰性生成。
- 不修改 `docs/03_API/`，因为没有接口行为变化。

### NestJS / Prisma / MySQL / Redis

- 不新增 Controller、Service、Module、DTO。
- 不新增 Prisma Model、Migration 或数据库查询。
- 不创建 Redis Key、Stream、Lock、Pub/Sub 或缓存。
- Benchmark 报告只在当前页面内存中生成，并由用户显式下载 JSON；不远程上传。

## 20. Benchmark 设计

### 20.1 固定计划

默认每个执行使用：

- 1,000,000 行 × 100 列。
- 固定 Seed、960 × 560 CSS px Viewport、28 px 行高。
- Row Overscan 4、Column Overscan 2。
- 同一组 180 个确定性纵横滚动位置，包含短距离连续滚动、25%/50%/90% 跨区跳转和首尾定位。
- 三轮正式样本，不执行额外 Warmup。

三种 Renderer 使用循环轮换：

```text
round 1: DOM → Main Canvas → Worker Offscreen
round 2: Main Canvas → Worker Offscreen → DOM
round 3: Worker Offscreen → DOM → Main Canvas
```

任意时刻只存在一个 Renderer。每次执行：

```text
mount
  → wait ready
  → wait first presentation commit
  → reset collector
  → run fixed trace
  → wait matching final commit
  → read consistency snapshot
  → dispose
  → two RAF + idle settle
```

### 20.2 指标

每次执行保留：

- Init to Ready 与 First Presentation Commit Proxy。
- Scroll-to-Commit Average / P50 / P95 / Max。
- Renderer Draw Average / Max。
- Long Task Count / Total / Max。
- Commit Count、Fallback/Failure Reason。
- 最终可见文本摘要。

内存只在 `measureUserAgentSpecificMemory()` 可用且页面满足安全条件时记录；否则写入
`{ supported: false, reason: 'unavailable' }`，不使用 `performance.memory` 猜测跨浏览器结果。

### 20.3 报告

```ts
interface GridBenchmarkReport {
  schemaVersion: 1;
  status: 'completed' | 'stopped';
  generatedAt: string;
  environment: GridBenchmarkEnvironment;
  configuration: GridBenchmarkConfiguration;
  executions: readonly GridExecutionResult[];
}
```

报告保留逐次执行，不把 Fallback 冒充请求的 Worker Renderer。JSON 导出创建 Object URL，下载触发后立即 Revoke。
一致性通过逐行的 `visibleTextDigest` 比较；CI 只验证协议和流程，不对固定毫秒数或 Renderer 倍数下结论。

## 21. Runtime 状态机

```text
idle
  └── mount → probing

probing
  ├── supported → initializing
  ├── unsupported(worker) → fallback-initializing
  └── failure → error

initializing
  ├── ready → rendering
  ├── worker failure → fallback-initializing
  └── non-worker failure → error

rendering
  ├── update → rendering
  ├── query → querying
  ├── worker failure → fallback-initializing
  ├── reset → resetting
  └── dispose → disposed

querying
  ├── progress → querying
  ├── newer query → querying(latest)
  ├── committed → rendering
  ├── empty → rendering(empty)
  └── failure → error / fallback

fallback-initializing
  ├── new canvas + main ready → fallback-ready
  └── failure → error

any active state
  └── dispose → disposed
```

状态文案通过映射表产生，不在 JSX 使用嵌套三目表达式。

## 22. 异常与边界

| 场景                   | 行为                                                                     |
| ---------------------- | ------------------------------------------------------------------------ |
| OffscreenCanvas 不支持 | 不转移 Canvas，直接建立 Main Canvas Fallback                             |
| Worker 构造失败        | 清理 Handler，使用当前 Canvas 或新 Canvas 进入 Fallback                  |
| 转移后初始化失败       | 终止 Worker、替换 Canvas、进入 Fallback                                  |
| Worker Error           | 使 Session 失效，忽略后续消息，替换 Canvas                               |
| Message Error/未知协议 | 记录脱敏原因并进入 Fallback                                              |
| Worker 初始化超时      | Worker Runtime 整体销毁并进入 Main Canvas Fallback                       |
| Context Lost           | 显示错误；Worker 路径按 Failure Policy 降级                              |
| Query 被新输入取代     | 旧 Token 继续返回时被丢弃，不更新 Projection                             |
| Query 无结果           | 显示 Empty，保留查询控件和清除入口                                       |
| 浏览器滚动尺寸过小     | 使用分段模式，并公开当前逻辑行                                           |
| DPR/Resize             | 更新 Backing Store、Geometry Version 和最新 Frame                        |
| Clipboard 拒绝         | 保留选区，显示可重试提示                                                 |
| 复制范围过大           | 拒绝生成无界 TSV，展示 Cell/Byte 上限                                    |
| 页面隐藏               | RAF 可能暂停；正式测量要求页面保持前台，不把后台样本作为性能结论         |
| React Strict Mode      | Effect Cleanup 后旧 Session 不可提交，新 Runtime 只建立一次有效 Listener |

用户可恢复错误显示在工作区内，不使用 Console 作为产品反馈。Console 和报告不包含完整 Cell 文本或复制内容。

## 23. 安全

- Cell Formatter 返回受控字符串或数值，不返回 HTML。
- DOM Renderer 使用 React 文本节点；命令式 Overlay 使用 `textContent`。
- Canvas 使用 `fillText`，不解析标签。
- Tooltip、状态和 ARIA 文本都来自同一安全 Formatter，不使用 `innerHTML`。
- Worker Payload 通过 Runtime Guard 校验，不能因未知对象污染 Controller State。
- Query、跳转、Overscan、列宽和复制范围均 Clamp 到明确上限。
- Fault Injection 只接受预定义枚举，不执行用户脚本。
- Benchmark JSON 不包含完整数据、选择内容、Cookie、Token、URL Query 原文或潜在敏感值。

## 24. 测试矩阵

### Unit

- 固定 Seed 在 Main/Worker 生成相同 Row ID、Cell Value 和摘要。
- 固定行高边界、列前缀二分、Overscan Clamp、空结果和首尾 Cell。
- CSS/DPR 转换、Resize 和边界 Hit Test。
- 直接/分段滚动、Guard Band Rebase、跳首尾行和 Suppression Token。
- Selection Normalize、Query 后 Row ID 恢复、TSV 转义和复制上限。
- Frame Scheduler 同帧合并、Pending Latest、Dispose 和过期 Commit。
- Worker Envelope Guard、乱序、旧 Session、未知消息、超时和 Reset。
- Query 分块取消、稳定排序、Filter Empty 和摘要一致。
- Benchmark 循环轮换、Percentile、停止、Fallback 排除和报告序列化。

### Component

- 默认 UI 明确显示 1,000,000 × 100。
- Loading、Ready、Querying、Empty、Unsupported、Fallback 和 Error。
- 三 Renderer 切换只保留一个 Runtime。
- DOM Renderer 只挂载可见纯 HTML 行列，不包含 SVG `foreignObject` Cell。
- 键盘导航、选区、复制失败、跳转和列宽调整。
- Worker 失败后 Canvas Generation 变化并恢复 Main Canvas。
- Canvas 活动 Cell 的 `row/gridcell` 所有权、行列总数和状态播报。
- 非法 Mode Query 回退 Workbench，Benchmark 运行中禁用模式切换。

### Playwright

- 从 Labs 卡片进入默认百万行 × 100 列工作台。
- 三 Renderer 首帧、连续纵横滚动和 1/500,000/1,000,000 行跳转。
- 列宽、Resize、浏览器缩放、点击命中和键盘自动滚入视口。
- 范围选择、TSV 复制、全选上限。
- 百万行排序过滤、连续 Query Latest-Wins 和 Empty。
- Offscreen Unsupported、初始化失败、运行时失败、Message Error、Timeout Fallback。
- `?mode=benchmark` 短轨迹流程、单 Renderer 生命周期、轮换顺序、报告和 JSON 下载。
- 窄屏、Focus、ARIA、Console Error、React Warning 和未处理 Promise。
- Home、Labs、Agent 和 Markdown Lab 回归。

性能完整三轮由生产 Build 手动运行并形成 `benchmark-report.md`，不让 CI 固定机器噪声成为性能门禁。

## 25. 替代方案

### 直接复刻 `ola-sheet`

不可取。其核心思想有参考价值，但源码包含框架外壳、弱类型协议、全局状态和生命周期问题；直接复制会继承问题，也无法证明
我们理解了渲染引擎边界。

### 只实现 DOM 虚拟列表

实现成本低，但不能验证 Canvas/Worker 的主线程收益，也无法覆盖水平虚拟化和离屏绘制的工程边界。

### 使用 TanStack Virtual/Table

成熟且适合业务交付，但会让 DOM 基线和 Canvas 路径使用不同 Geometry。本 Lab 首要目标是同口径比较，因此首期自建小型
二维几何核心；未来业务产品应重新评估成熟库。

### 主线程 Canvas + 数据 Worker

是可靠的中间方案，也是 Offscreen Fallback。它减少 DOM，但绘制仍占用主线程，不能替代 Worker Offscreen 对照。

### WebGL / WebGPU

适合更复杂图形和超高绘制吞吐，但文本栅格、可访问性、兼容性和实现成本更高，超出首期研究问题。

### 首期直接做 Web Component

Custom Element 可以解决跨框架封装，不能自动解决数据惰性、二维裁剪、消息一致性和资源清理。先稳定纯 TypeScript
Engine 与 React Adapter，再增加 Web Component Adapter，风险更低且不会锁死 API。

### 服务端分页

适合真实远程数据，但会把网络、缓存和后端延迟混入渲染对比。本 Lab 首期用浏览器内确定性数据隔离渲染问题。

## 26. 风险与控制

| 风险                         | 控制措施                                                      |
| ---------------------------- | ------------------------------------------------------------- |
| 百万行排序耗时过长           | Worker 分块、进度、Latest-Wins、稳定索引数组、独立 Query 指标 |
| 浏览器滚动上限差异           | 运行时探测、安全余量、分段重定位、首尾 E2E                    |
| Worker 与主线程画面不同步    | Session/Frame/Geometry/Query Version 全链路校验               |
| Offscreen 降级后 Canvas 失效 | Canvas Generation 强制替换，不复用已转移节点                  |
| Canvas 文本与 DOM 格式不一致 | 共享 Formatter、Theme 和一致性摘要                            |
| React 重渲染污染 Benchmark   | Controller/Renderer 命令式边界、单 Renderer Host、隔离 Runner |
| 内存指标误导                 | 仅能力存在且安全条件满足时记录，否则 unavailable              |
| Canvas 可访问性不足          | Grid Host + 有界活动 Row/Cell 语义镜像 + 键盘模型             |
| 动态几何违反样式约束         | 数值元素属性承载几何，视觉规则只使用 Tailwind/语义 Token      |
| Benchmark 被降级结果污染     | Fallback 样本单列并从 Worker Offscreen 汇总排除               |

## 27. 可迁移结论

如果 Lab 验证通过，可复用边界是：

```text
Pure Grid Engine
├── Data Source Contract
├── Geometry / Scroll / Selection
├── Renderer Contract
├── Worker Protocol
└── Metrics Contract
      │
      ├── React Adapter（本次）
      └── Web Component Adapter（未来）
```

未来 Web Component 只负责 Attribute/Property、Custom Event、Slot/Overlay Host 和
`connectedCallback/disconnectedCallback`，不重写 Engine。只有在至少两个真实调用方出现并完成 API 评审后，才将核心
提取到 `packages/` 或发布 npm 包。

## 28. 标准依据

- [HTMLCanvasElement.transferControlToOffscreen](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen)
  明确 Canvas 已设置 Context 或已经转移后再次调用会抛出 `InvalidStateError`。
- [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
  说明其可作为 Transferable 在 Worker 中绘制，但具体能力仍需运行时探测。
- [DedicatedWorkerGlobalScope.requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorkerGlobalScope/requestAnimationFrame)
  说明 Worker RAF 依赖关联 Window，且可能抛出不支持错误，因此保留调度降级。
- [ARIA grid role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/grid_role)
  定义二维键盘导航、Row/Cell 所有权和只读/多选语义。
- [measureUserAgentSpecificMemory](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory)
  仍为受限能力并要求安全上下文与跨源隔离，因此内存指标只能作为可选数据。
