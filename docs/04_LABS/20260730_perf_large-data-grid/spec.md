# Large Data Grid

## Intent

实现一个面向数据中台、AI 评测结果、Agent Trace 和大规模查询结果展示场景的生产级大数据表格实验。

Lab 以“Worker 内数据与绘制闭环、Canvas 与 DOM 混合交互、二维可见区域裁剪”为核心，构建一个与 React
解耦的纯 TypeScript Grid Engine，并通过同一套确定性数据、固定视口和隔离执行协议，对比以下三种渲染路径：

1. DOM 行列双向虚拟化。
2. 主线程 Canvas 可见区域绘制。
3. Web Worker + OffscreenCanvas 离屏绘制。

实验不仅验证首次渲染速度，还要覆盖连续滚动、快速跳转、排序、过滤、框选、复制、列宽调整、Worker
故障降级、资源释放和可访问性，并以可复现指标说明每种方案的适用边界。

本 Lab 参考 `ola-sheet` 的架构思想，但不复制其源码、Vite 外壳、全局插件状态、弱类型消息和已识别的安全与生命周期问题。

## Positioning

- Lab 名称：大数据表格离屏渲染与交互。
- 英文名称：Large Data Grid / Offscreen Data Grid。
- 路由：`/labs/large-data-grid`。
- 分类：Data-intensive UI / Rendering Performance。
- 难度：Expert。
- 核心场景：默认验证 1,000,000 行 × 100 列，共 100,000,000 个逻辑单元格。
- 核心价值：将大数据表格从“渲染很多单元格”改造为可计算、可调度、可降级、可测量的渲染引擎。
- 运行边界：首期为纯前端独立 Lab，不新增 NestJS、MySQL、Redis 或远程持久化依赖。
- 交付边界：首期实现保留在 Lab 内，不立即提取到 `packages/`；经过真实复用与 API 评审后再决定是否组件化发布。

## Constraints

### 模块与职责边界

- Lab 页面和业务实现必须独立，不得依赖 Agent Stream Recovery 或 Markdown Stream Rendering 的业务代码。
- Next.js 路由文件只加载模块入口，全部实现放在 `apps/web/src/labs/large-data-grid/`。
- React 只负责 Lab 页面、控制器和生命周期接入；可见范围、数据模型、消息协议和绘制核心不得依赖 React、Next.js
  或 Zustand。
- Grid Engine 必须使用纯 TypeScript，并为未来的 React、Web Component 或其他框架 Adapter 保留稳定边界。
- 本阶段不实现标准 Custom Element，不注册 `<large-data-grid>`；未来如出现跨框架需求，只增加 Adapter，不重写引擎。
- 不直接复制 `ola-sheet` 源码，不引入其 Vite Worker、Less、Tapable 全局插件或 `globalThis` 单例设计。

### 数据规模与内存

- 默认验证场景固定为 1,000,000 行、100 列的确定性逻辑数据；允许提供更小规模作为开发调试档，但不得用其替代
  默认功能验证或正式 Benchmark。
- 数据使用固定 Seed 和稳定 Row ID 生成，同一配置在三种渲染路径中必须得到相同单元格内容。
- 不允许为百万行默认场景在主线程创建完整 `rows[][]` 单元格矩阵。
- Worker 路径优先在 Worker 内生成或读取数据，禁止先在主线程物化完整数据后再无条件结构化克隆。
- 排序、过滤和选择状态以 Row ID、Column ID 和索引投影表达，不得通过反复深拷贝完整数据完成状态切换。
- 必须区分逻辑数据规模、实际物化数据、可见单元格和已绘制单元格，指标不得混用。
- 不得假设浏览器可以用单个 DOM 元素稳定表达任意逻辑滚动高度；百万行场景必须显式验证滚动尺寸上限，并采用
  受控分段、重定位或明确的安全边界。

### 渲染路径

- DOM Baseline 必须同时虚拟化行和列，不得用只虚拟化行的实现冒充二维虚拟化基线。
- DOM Baseline 必须使用纯 HTML `div` 行、单元格和绝对定位，不得通过 SVG `foreignObject` 承载可见单元格；
  SVG 仅允许用于不计入 Cell 节点基准的选区和列宽交互 Overlay。
- Main Canvas 与 Offscreen Canvas 必须复用相同的几何模型、Cell Formatter、主题和可见范围定义。
- Canvas 只绘制当前可见范围和有界 Overscan，不得遍历全部逻辑行列。
- Canvas CSS Viewport 尺寸与 DPR Backing Store 尺寸必须分别建模；可见范围只使用 CSS 像素口径。
- Offscreen 路径将 Canvas 控制权转移到 Worker；数据生成、查询、可见范围和绘制尽量在同一 Worker 闭环完成。
- OffscreenCanvas 不支持、Worker 创建失败、运行时异常、消息异常或请求超时时，必须降级到主线程 Canvas，
  页面不得卡在 Loading 或保留半初始化资源。
- 三种路径必须共享同一逻辑状态模型，切换 Renderer 时保持数据配置和可验证的视图语义，不携带已失效的运行态资源。

### 调度与一致性

- Scroll、Resize 和数据查询采用 Latest-Wins 语义；同一 Renderer 同一帧最多提交一次绘制。
- Worker 消息使用严格判别联合类型，并携带 `rendererId`、`requestId` 和必要的版本信息。
- 旧请求、乱序响应和已销毁 Renderer 的消息不得覆盖当前视图。
- 输入位置已经更新但对应画面尚未完成时，不得把任务标记为已提交。
- Reset、切换 Renderer、停止 Benchmark 和页面卸载必须取消 RAF、Timer、Observer、Worker Handler 和异步查询。
- React Strict Mode 重复建立和清理 Effect 时，不得创建重复 Worker、重复 Listener 或重复绘制循环。

### 表格能力

- 首期使用固定行高，支持固定表头、行号列和可调整列宽。
- 支持单元格点击、键盘方向导航、连续区域框选、全选和 TSV 复制。
- 选择状态由稳定 Row ID / Column ID 表达，不依赖当前 DOM 节点或 Canvas 像素对象的生命周期。
- 支持单列排序、关键字过滤和快速跳转到指定行；大规模计算不得阻塞主线程。
- 快速滚动、跨百万行跳转、列宽变化和容器 Resize 后，命中测试、绘制内容和选择区域必须保持一致。
- Tooltip、菜单、焦点单元格等能力使用少量 DOM Overlay，不为每个 Canvas 单元格创建隐藏 DOM。
- 首期不提供单元格编辑和数据写回；双击不得伪装为已实现编辑能力。

### 可访问性

- Lab 必须提供键盘可操作的活动单元格，支持方向键移动和可见 Focus。
- Grid 容器必须暴露可读名称、总行列数量、活动单元格位置和必要的状态说明。
- Canvas 路径必须为 Screen Reader 提供有界的活动单元格语义，不得让整个表格成为不可读黑盒。
- 状态不得只通过颜色表达；排序、过滤、选中、降级和错误必须具有文本语义。
- 浏览器缩放、DPR 变化和窄屏环境下，表格不得产生无法恢复的焦点或滚动状态。

### DOM 与安全

- 单元格内容默认按纯文本处理，禁止把外部数据直接拼接到 `innerHTML`、Tooltip 或菜单 HTML。
- DOM Overlay 使用 `textContent` 或 React 安全文本渲染；如未来允许富内容，必须经过独立安全策略评审。
- 剪贴板失败、Worker 失败、内存能力不足和不支持的浏览器能力必须给出可恢复反馈。
- 不记录完整表格数据、用户复制内容或潜在敏感字段到控制台、指标报告和测试快照。

### UI 与观测

- 页面使用当前 shadcn、Lucide、Tailwind 语义 Token 和 Lab Detail Layout。
- 页面提供交互工作台和隔离 Benchmark 两种模式，并通过 URL Query 保留模式。
- 工作台至少可以调整 Renderer、数据规模、列数、Overscan 和故障注入，并展示当前可见范围与运行时状态。
- Benchmark 必须使用固定数据、固定视口、固定滚动轨迹和相同执行轮次；任意时刻只测量一个 Renderer。
- Benchmark 采用交替顺序降低固定执行顺序偏差，执行之间完整卸载 Renderer 并等待浏览器稳定。
- 指标至少包含初始化耗时、首帧、Scroll-to-Commit 平均值/P50/P95/最大值、Main Thread、Worker Draw、
  Long Task、绘制或挂载单元格数、消息数、Commit 数和降级次数。
- 内存指标只在浏览器提供可靠 API 时记录；不支持时明确标记为 unavailable，不使用猜测值。
- CI 不设置固定毫秒数或性能倍数门禁；任何性能结论必须来自相同设备、浏览器和生产构建的真实测量。
- 三种 Renderer 的最终活动单元格、可见文本摘要和排序/过滤结果必须可验证一致。

### 测试与回归

- 纯算法单测覆盖二维可见范围、列宽前缀、滚动映射、逻辑高度分段、命中测试、选择区间和消息版本判断。
- Worker 测试覆盖初始化、绘制请求、乱序响应、故障、超时、Reset 和资源释放。
- 组件测试覆盖 Renderer 切换、Loading、Error、Empty、Fallback 和键盘导航。
- Playwright 以 1,000,000 行 × 100 列覆盖主流程、跨区跳转、连续滚动、列宽调整、选择复制、排序过滤、Worker
  降级、响应式和可访问性。
- 现有 Home、Labs、Agent Lab、Markdown Lab 和公共 UI 行为不得回归。
- Structure、Format、Lint、Type Check、Unit Test、Build、Knip 和 E2E 必须全部通过。

## Acceptance Criteria

1. `/labs/large-data-grid` 是独立 Lab 页面，并通过 Labs 卡片进入。
2. 路由文件保持薄层，模块实现完整位于 `apps/web/src/labs/large-data-grid/`。
3. 核心 Grid Engine 不依赖 React、Next.js、Zustand 或其他 Lab。
4. 页面提供 DOM Virtual、Main Canvas 和 Worker Offscreen 三种 Renderer。
5. 三种 Renderer 使用相同 Seed、Row ID、Column ID、数据规模、视口和格式化规则。
6. 工作台、隔离 Benchmark 和默认 Playwright 验证均以 1,000,000 行 × 100 列作为默认数据规模。
7. 百万行场景不在主线程创建完整 `rows[][]` 单元格矩阵。
8. DOM Renderer 使用纯 HTML 同时虚拟化行和列，不包含 SVG `foreignObject` Cell，挂载节点数不随总行列数线性增长。
9. 两种 Canvas Renderer 只绘制可见范围和有界 Overscan。
10. Worker Offscreen 路径在 Worker 内完成数据生成、可见范围计算和绘制。
11. 不支持 OffscreenCanvas 时自动进入 Main Canvas Fallback，并明确显示原因。
12. Worker Error、Message Error 或超时后能够释放失效 Worker，并安全降级继续展示。
13. Canvas CSS 尺寸、DPR Backing Store 和逻辑表格尺寸使用不同字段表达。
14. 在 DPR 1、2 和浏览器缩放场景下，可见范围和命中测试保持正确。
15. 连续 Scroll Event 使用 Latest-Wins，同一 Renderer 同一帧最多提交一次绘制。
16. 乱序或过期 Worker Response 不会回滚滚动位置或覆盖新视图。
17. 百万行快速跳转不会越过浏览器滚动尺寸边界或进入不可恢复位置。
18. 固定表头、行号列、列宽调整和容器 Resize 后内容保持对齐。
19. 用户可以点击单元格，并使用方向键移动活动单元格。
20. 用户可以框选连续区域和全选；安全上限内可复制为 TSV，超限时提供明确且可恢复的反馈。
21. 选择状态跨 Renderer 重绘和可见窗口变化后保持逻辑一致。
22. 用户可以执行单列排序、关键字过滤和跳转到指定行。
23. 排序与过滤结果在三种 Renderer 中使用相同可验证摘要。
24. Tooltip 和活动单元格使用有界 DOM Overlay，不为全部 Canvas 单元格创建 DOM。
25. 外部单元格文本无法通过 Tooltip、菜单或 Overlay 注入脚本和事件属性。
26. Grid 提供可读名称、总行列数量、活动位置、排序和过滤状态语义。
27. Loading、Error、Empty、Unsupported 和 Fallback 状态均具有明确界面。
28. 页面提供交互工作台和隔离 Benchmark，并使用 URL Query 保留模式。
29. Benchmark 任意时刻只挂载一个 Renderer，执行顺序按轮次交替。
30. Benchmark 从输入开始测量到对应视图已经提交，不在消息发送完成时提前结束。
31. 报告展示初始化、首帧、Scroll-to-Commit、Main Thread、Worker Draw、Long Task、Commit
    和可见单元格等指标。
32. 报告保留逐轮原始结果、真实执行顺序、浏览器环境和数据配置。
33. 最终报告验证三种 Renderer 的可见内容、活动单元格和数据结果一致。
34. Reset、模式切换、停止和页面卸载后不存在残留 Worker、RAF、Timer、Observer 或 Listener。
35. 单元测试覆盖核心算法和 Worker 协议，Playwright 覆盖主流程、异常路径、性能工作流和可访问性。
36. 现有页面和 Lab 不发生功能回归。
37. 架构、数据流、消息协议、调度状态、性能口径、替代方案、风险和验证结果均有对应文档。
38. Structure、Format、Lint、Type Check、Unit Test、Build、Knip 和 E2E 全部通过。
39. 工作台默认使用紧凑单行操作栏，Grid 占满页面剩余高度；桌面与窄屏下页面均不产生纵向滚动，数据滚动只发生在
    Grid 内部，展开高级设置时 Grid 能随剩余空间实时收缩。

## Out of Scope

- Excel 公式、依赖图和自动重算。
- 单元格编辑、数据写回、Undo/Redo 和协同编辑。
- 合并单元格、冻结任意区域、树形行和无限级组合表头。
- 动态行高、富文本单元格、图片和嵌入式业务组件。
- Excel 文件解析、导入导出和完整剪贴板格式兼容。
- 服务端分页、数据库持久化和跨设备 Benchmark 聚合。
- SharedArrayBuffer、WebAssembly、WebGPU 和多 Worker 并行计算。
- 首期提取 npm Package 或标准 Web Component。

## UseCase

### UC-01 · 打开默认百万行工作台

**前置条件**

- 用户从 Labs 入口进入 `/labs/large-data-grid`。
- URL 未指定其他模式或调试数据规模。

**操作**

1. 页面建立默认 Renderer。
2. 数据源使用固定 Seed 初始化 1,000,000 行 × 100 列逻辑数据。
3. 用户查看当前可见范围、逻辑单元格数、实际物化量和 Renderer 状态。

**预期**

- 页面不创建完整 `rows[][]`，能够在有界时间内显示首帧。
- UI 明确显示 `1,000,000 × 100`、当前可见行列、绘制或挂载单元格数。
- Loading、Ready、Unsupported、Fallback 和 Error 不相互混淆。

### UC-02 · 连续滚动与跨百万行跳转

**前置条件**

- Grid 已进入 Ready。

**操作**

1. 用户快速纵向和横向连续滚动。
2. 用户通过跳转输入定位到第 500,000 行和第 1,000,000 行。
3. 用户回到首行并重复跨区跳转。

**预期**

- 只计算并提交最新 Viewport，过期帧不覆盖当前画面。
- 可见内容、行号、命中测试和状态栏位置一致。
- 浏览器滚动高度受限时自动分段和重定位，首尾行仍可到达，焦点不会丢失。

### UC-03 · 切换三种 Renderer

**前置条件**

- 用户已滚动到非首屏位置并选中一个单元格。

**操作**

1. 依次切换 DOM Virtual、Main Canvas 和 Worker Offscreen。
2. 每次等待 Renderer 进入 Ready。

**预期**

- Seed、查询条件、列宽、逻辑位置和活动单元格保持一致。
- 已卸载 Renderer 的 RAF、Worker、Observer 和 Listener 被清理。
- 三种实现的可见文本摘要和活动单元格语义一致。

### UC-04 · 键盘导航、范围选择与复制

**前置条件**

- Grid 容器获得键盘焦点。

**操作**

1. 使用方向键、Page Up、Page Down、Home、End 移动活动单元格。
2. 按住 Shift 扩展连续选区。
3. 使用全选快捷键和复制快捷键。

**预期**

- 活动单元格自动进入可见区域并具有可见 Focus。
- 选择锚点由稳定 Row ID / Column ID 表达，重绘和 Renderer 切换后不漂移。
- 复制结果为确定性 TSV；大选区超过安全上限时不给主线程制造不可控字符串，并给出可恢复提示。

### UC-05 · 排序、过滤与 Latest-Wins

**前置条件**

- 默认百万行数据已就绪。

**操作**

1. 用户对单列执行升序、降序和取消排序。
2. 用户连续输入多个过滤关键词，并在前一个查询完成前继续输入。
3. 查询中切换 Renderer 或 Reset。

**预期**

- 大规模查询在 Worker 中分块执行，不阻塞主线程交互。
- 只有最新 `queryVersion` 可以提交，旧结果被丢弃。
- 三种 Renderer 得到相同的结果数量、首尾 Row ID 和查询摘要。
- Empty、查询中、已取消和失败状态具有独立文本反馈。

### UC-06 · 列宽、Resize、DPR 与命中测试

**前置条件**

- Grid 显示多列并存在水平滚动。

**操作**

1. 用户拖动表头调整列宽。
2. 调整浏览器窗口宽度和缩放比例。
3. 在 DPR 变化后点击可见区域边界单元格。

**预期**

- 表头、行号、单元格、选择框和命中区域保持对齐。
- 可见范围只使用 CSS 像素计算，Canvas Backing Store 独立按 DPR 更新。
- Resize 与滚动合并到最新帧，不产生重复 Worker 或绘制循环。

### UC-07 · Worker 故障与安全降级

**前置条件**

- 当前 Renderer 为 Worker Offscreen。

**操作**

1. 注入 Worker 初始化失败、运行时错误、消息错误和超时。
2. 在失败后继续滚动、选择和切换 Renderer。

**预期**

- 失效 Worker 被终止，已经转移控制权的 Canvas 被替换。
- 页面使用新 Canvas 进入 Main Canvas Fallback，并展示具体原因。
- 当前数据配置、查询、逻辑位置和选择语义被恢复，不停留在 Loading。

### UC-08 · 运行隔离 Benchmark

**前置条件**

- 用户通过 `?mode=benchmark` 进入隔离 Benchmark。

**操作**

1. 使用默认 1,000,000 行 × 100 列配置启动三种 Renderer 的三轮隔离执行。
2. 观察固定滚动轨迹和实时指标。
3. 运行完成后查看逐轮结果、一致性和环境信息，并导出 JSON。

**预期**

- 任意时刻只挂载一个 Renderer，三轮使用轮换顺序。
- 每次执行完整卸载并等待浏览器稳定，不创建隐藏的并行对照 Renderer。
- 报告保留所有正式样本、真实顺序、完成状态、Fallback 和不支持信息。
- Worker Fallback 样本不冒充 Worker Offscreen 性能结果。

### UC-09 · 可访问性与窄屏使用

**前置条件**

- 用户使用键盘或 Screen Reader，或在窄屏设备打开页面。

**操作**

1. 聚焦 Grid 并浏览活动单元格。
2. 执行排序、过滤、选择和跳转。
3. 在窄屏下横向滚动 Grid、常用操作栏和指标条。

**预期**

- Grid 暴露名称、只读状态、总行列数、活动行列和查询状态。
- Canvas Renderer 维护有界的 `row/gridcell` 语义镜像，活动单元格可被读取。
- 状态不只使用颜色表达；页面保持在可用视口内，Grid、工具栏和指标条分别控制必要的局部滚动，不撑破 Lab Detail
  Layout。

### UC-10 · Reset、停止与页面卸载

**前置条件**

- Renderer 正在绘制、查询或运行 Benchmark。

**操作**

1. 用户执行 Reset 或停止 Benchmark。
2. 用户切换模式或离开页面。

**预期**

- 所有异步结果经过 Session Token 校验，停止后不再更新 React State。
- Worker、RAF、Timer、ResizeObserver、PerformanceObserver、事件监听和 Object URL 全部释放。
- 再次进入页面只建立一个新 Runtime，React Strict Mode 下无重复副作用。

## Tasks

- [x] T-01 建立 Lab 薄路由、Registry 入口、模块目录和模式 Query 解析。
- [x] T-02 定义纯 TypeScript 数据、几何、交互、Renderer、指标和 Worker 判别联合类型。
- [x] T-03 实现固定 Seed 的惰性百万行数据源、稳定 ID、Cell Formatter 和一致性摘要。
- [x] T-04 实现固定行高、列宽前缀、二维可见范围、Overscan、命中测试和 CSS/DPR 坐标转换。
- [x] T-05 实现浏览器滚动尺寸探测、直接滚动和分段重定位模型。
- [x] T-06 实现共享 Grid Controller、Frame Scheduler、Latest-Wins 和严格资源清理。
- [x] T-07 实现纯 HTML DOM 行列双向虚拟化 Renderer 及其 Commit 回报。
- [x] T-08 实现共享 Canvas Painter 和 Main Canvas Renderer。
- [x] T-09 实现 Worker Offscreen Renderer、消息协议、Worker 内数据/查询/绘制闭环。
- [x] T-10 实现 Worker 能力探测、初始化超时、Canvas 替换和 Main Canvas Fallback。
- [x] T-11 实现活动单元格、键盘导航、范围选择、全选、TSV 复制和有界复制保护。
- [x] T-12 实现固定表头、行号列、列宽调整、Resize、Tooltip 和有界 DOM Overlay。
- [x] T-13 实现单列排序、指定字段关键字过滤、查询进度、取消和结果一致性摘要。
- [x] T-14 实现 Grid ARIA 容器、DOM 语义以及 Canvas 活动单元格语义镜像。
- [x] T-15 实现工作台控制区、运行状态、可见范围、错误/空态/降级和实时指标面板。
- [x] T-16 实现默认百万行 × 100 列的隔离 Benchmark 计划、Runner、统计和 JSON 报告。
- [x] T-17 为 Core、Worker 协议和复杂交互补充 Vitest 测试。
- [x] T-18 补充组件测试和百万行 × 100 列 Playwright 主流程、异常、响应式与可访问性验证。
- [x] T-19 更新 Web 架构、设计规范、Labs 文档和技术决策，记录可迁移结论。
- [x] T-20 执行 Structure、Format、Lint、Type Check、Unit、Build、Knip 与 E2E 完整自测。
- [x] T-21 根据体验验证反馈压缩操作栏，并让工作台 Grid 自适应占满剩余视口高度。
