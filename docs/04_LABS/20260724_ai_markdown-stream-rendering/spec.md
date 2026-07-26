# Markdown Stream Rendering

## Intent

实现一个面向高频 AI 输出场景的生产级 Markdown 流式增量渲染实验。Lab 使用同一条确定性的 append-only
文本流，对比“主线程全量解析并替换 DOM”和“Web Worker 解析、块级 Diff、最小 Patch、主线程最小提交”的完整链路，
并以可复现指标证明两种方案在长文档、多实例和重交互块场景下的真实差异。

本 Lab 以现有独立项目 `markdown-kit` 为算法原型，但不复制其 Next.js 应用外壳、工程配置和已识别的可靠性问题。
迁移后的实现必须遵守当前 Monorepo 的模块边界、组件目录、设计系统、测试和文档规范。

## Positioning

- Lab 名称：Markdown 流式增量渲染。
- 路由：`/labs/markdown-stream-rendering`。
- 核心价值：把高频 Markdown 渲染从“每次全量重算”改造为显式、可观测、可降级的增量协议。
- 运行方式：纯前端独立实验，使用模块内确定性 Mock 模拟真实 Token 流。
- 对比基线：`markdown-it` 在主线程全量解析并替换渲染容器，不宣称为 React 全量渲染。
- 增量方案：Worker 解析与分块 → 签名与 Diff → Patch 协议 → 主线程提交 → 交互块局部挂载 React。

## Constraints

### 模块边界

- Lab 页面和业务实现必须独立，不得依赖 Agent Stream Recovery 或其他 Lab。
- Next.js 路由文件只加载模块入口，全部实现放在 `src/labs/markdown-stream-rendering/`。
- 不新增后端接口、数据库表、Redis Key 或持久化逻辑。
- 不替换现有公共 `MarkdownRenderer`，也不改变 Agent Lab 当前渲染行为。
- 核心算法不得依赖 React、Next.js 或 Zustand；浏览器 DOM Runtime 与纯算法层分离。
- 不在本次任务中抽取 npm Package；模块稳定后再评估提升到 `packages/`。

### 流式输入

- Legacy 与 Incremental 必须消费同一组 `StreamFrame`，每帧拥有稳定序号、Delta、累积全文和完成标识。
- 默认输入是 append-only；结构跳变由 Markdown 在不同截断点的解析结果自然产生。
- Chunk 切分使用可复现的 Seeded Random，禁止用 `Math.random()` 生成不可复现的基准数据。
- 支持长段落、内联语法、代码块、表格、列表、引用、链接、原始 HTML 和混合长文档场景。
- 性能对比必须在相同输入、相同帧边界、相同预热条件和相同生产构建下完成。

### 超大 Markdown 基线

- 创建独立 `.md` Fixture 文件作为性能基线的数据源，不把超长 Markdown 内嵌在 React 组件或 Hook 中。
- Fixture 必须模拟真实 LLM 技术回答，包含多级标题、长正文、引用、有序/无序列表、表格、链接、行内代码和代码围栏。
- Fixture 至少包含两个代码围栏，每个代码围栏的源码不得少于 300 行。
- 运行时将同一份 Fixture 确定性复制 10 份并加入稳定分隔，不在物理文件中手工维护十份重复内容。
- Legacy 与 Incremental 必须先加载完全相同的十份基线，禁止为两栏生成不同内容。
- 基线渲染稳定后再开始尾部流式追加；流式性能指标必须清除基线装载样本，避免初始大 DOM 插入掩盖增量阶段。
- Reset、场景切换和重新运行都必须回到相同基线，不允许先清空页面再从第一个字符重放整份超长文档。
- Fixture 加载必须具有 Loading、Error 和 Retry 状态；加载失败时不得启动性能测试。
- 所有代码块设置统一最大高度，超出后在代码块自身纵向滚动，同时保留横向滚动能力。

### 解析与 Patch

- 使用 `markdown-it` 作为 Markdown Parser，但不依赖第三方增量渲染能力。
- Worker 负责 Markdown 解析、顶层块切分、块签名、前后缀 Diff 和 Patch 生成。
- Patch 至少包含 `replaceRange`、`tailAppendText` 和 `tailAppendFallbackHtml` 三种操作。
- 每个 Patch Result 必须携带 Renderer、Request 和 Revision 信息；主线程校验基线后才能提交。
- Patch 重放不得重复追加文本；重复、过期或基线不匹配的 Patch 必须安全忽略或触发快照恢复。
- `tailAppendText` 只能命中具有明确文本锚点的安全场景；嵌套内联结构后的文本只能追加到显式块级根节点，并以完整
  Snapshot 校验结果，不能用“最深末尾元素”猜测落点。
- 每个块必须隔离内容 Host 与 React Tools Host，文本追加不得进入交互工具节点。
- Worker 基线只有在主线程成功提交后才能被视为已确认；提交失败必须能够重新同步完整快照。

### Worker 与调度

- 全页实例共享 Worker，并使用 `rendererId` 隔离基线。
- 同一 Renderer 使用 Single-flight 和单调递增 `reqId`，过期响应不得覆盖新内容。
- DOM 提交使用 RAF 合帧；下一次 Worker 请求只在 Patch 真正落地并确认后推进。
- Worker 必须处理 `error`、`messageerror`、请求超时、实例 Reset、Unmount 和页面多实例清理。
- Worker 不可用时必须降级到安全的主线程全量渲染，页面不得永久停留在处理中。
- 最后一个 Renderer 注销后应释放 Worker 和关联 Handler，避免跨页面残留。

### DOM、React 与安全

- 增量容器使用明确的非 React 托管 DOM 边界；React 只挂载代码块、表格等交互工具。
- React Root 必须复用并在块删除、替换和页面卸载时释放。
- 交互状态是否保留由稳定 Block Identity 决定，不能仅依赖临时 DOM Element 引用。
- 禁止组件使用内联样式；折叠状态通过语义 Class 或受控属性实现。
- Worker 可以输出原始 HTML，但任何 `innerHTML` 写入前必须经过 DOMPurify。
- 链接协议、`target`、`rel` 和危险标签/属性必须经过统一安全策略。
- Clipboard 失败必须有可恢复反馈，不得产生未处理 Promise Rejection。

### UI 与指标

- 使用当前项目的 shadcn、Lucide、Tailwind 语义 Token 和 Lab Detail Layout。
- 页面提供场景选择、播放/暂停、重置、流速和实例规模控制。
- 页面同时展示 Legacy 与 Incremental 结果、核心性能指标和 Patch 日志。
- 指标至少包含主线程总耗时/均值/峰值、Worker 解析与 Diff、Patch Apply、React Mount、操作分布和降级次数。
- 指标区分输入帧、Worker 请求和 DOM Commit，禁止把不同采样口径直接比较。
- CI 不使用固定性能阈值；真实生产构建数据写入 Verify，任何倍数收益必须来自同机同轮实测。

### 智能滚动跟随

- Legacy 与 Incremental 的每个 Renderer 实例必须分别维护自己的滚动跟随状态，不共享全局状态。
- 初始状态默认跟随底部；增量内容提交后，仅在仍处于跟随状态时滚动到最新内容。
- 用户主动向上滚动并离开底部阈值后暂停自动跟随，后续增量更新不得抢夺滚动位置。
- 用户重新滚动到底部阈值内时自动恢复跟随，下一次增量提交继续滚到底部。
- “是否位于底部”必须使用带容差的距离判断，避免小数像素、字体布局和浏览器取整造成状态抖动。
- 自动滚动在渲染提交后通过浏览器帧调度执行，并在组件卸载或新调度前取消旧 RAF。
- 程序触发的自动滚动不得被误判为用户主动离开底部；高频流式更新不得创建无界 Timer 或 RAF。
- Reset、切换场景和重新创建实例后恢复默认跟随底部。

## Acceptance Criteria

1. `/labs/markdown-stream-rendering` 是独立 Lab 页面，并通过 Labs 卡片进入。
2. 路由文件保持薄层，模块代码完整位于 `src/labs/markdown-stream-rendering/`。
3. Legacy 与 Incremental 消费相同的确定性流式输入，并能播放、暂停、重置和切换场景。
4. Incremental 的解析、分块和 Diff 在 Web Worker 中执行，主线程不重复解析 Markdown。
5. Patch 协议覆盖尾部文本追加、尾部结构回退和任意块范围替换。
6. Patch 具备 Revision 前置条件；重复应用、乱序响应和基线冲突不会造成重复文本或 DOM 损坏。
7. 普通段落、嵌套内联语法、未闭合/闭合代码块和表格成形过程均渲染正确。
8. 最终 Legacy 与 Incremental 的规范化内容和可见文本一致。
9. React Tools Host 与 Markdown Content Host 分离，代码块持续追加不会写入按钮或工具栏。
10. 代码块支持复制和折叠，表格支持复制 TSV；交互失败有明确反馈。
11. 多实例共用一个 Worker，但请求、基线、指标和销毁互不干扰。
12. Worker Crash、Message Error 或超时后自动进入 Legacy Fallback，并可通过重置重新启用增量路径。
13. Reset、切换场景和页面卸载时，不残留 RAF、Timer、Worker Handler 或 React Root。
14. 原始 HTML、危险 URL、事件属性和脚本输入无法突破 DOMPurify 安全边界。
15. Patch Log 能展示操作类型、Renderer、Request、Revision、块位置和降级原因。
16. Metrics 明确区分输入、计算与提交口径，并能导出本轮真实结果。
17. 重型混合文档在生产构建中完成同轮对比，Verify 记录实际数据和测试环境，不预写性能结论。
18. 纯算法层不依赖 React、Next.js、DOM 或模块外业务代码。
19. 自动化测试覆盖分块、签名、Diff、Patch 生成、Patch 应用、Revision、Sanitize 和 Worker 调度。
20. Playwright 覆盖主流程、最终内容一致性、交互块、Worker 降级、多实例和响应式布局。
21. 现有 Home、Labs、Agent Lab 和公共 `MarkdownRenderer` 行为不发生回归。
22. Structure、Format、Lint、Type Check、Unit Test、Build、Knip 和 E2E 全部通过。
23. 架构、数据流、Patch 协议、状态机、性能口径、风险和验证结果均有对应文档。
24. Legacy 与 Incremental 的所有 Renderer 实例默认随增量内容滚动到底部。
25. 用户向上滚动后，该实例暂停自动跟随，新增内容不会改变用户当前阅读位置。
26. 用户重新滚动到底部后，该实例自动恢复跟随。
27. 1×/4× 模式下每个实例的跟随状态互不影响。
28. 高频增量更新只保留一个待执行滚动 RAF，卸载后不残留调度任务。
29. Playwright 覆盖自动跟随、向上阅读暂停、回到底部恢复和多实例隔离。
30. 项目包含一份独立超长 Markdown Fixture，并且至少两个代码围栏分别达到 300 行。
31. 页面加载后，Legacy 与 Incremental 都以同一份 Fixture 的 10 倍内容作为初始基线。
32. 基线内容只在运行时复制，原始 `.md` 文件不保存十份重复文本。
33. 开始播放前基线已经完成渲染；性能指标从尾部流式追加开始重新计数。
34. Reset、切换场景和重跑后仍恢复到相同十份基线。
35. 代码块具有统一最大高度，纵向和横向溢出只在代码块内部滚动。
36. Fixture 加载过程具有 Loading、Error、Retry，并由 Unit 与 Playwright 覆盖。

## Use Cases

### 主路径

用户从 Labs 卡片进入页面，选择混合长文档并开始播放。左右两栏消费完全相同的累积 Markdown：Legacy 在主线程全量
解析和替换，Incremental 在 Worker 计算 Patch 后最小提交。页面持续展示两侧内容、指标和 Patch 日志，流结束后两侧
输出一致。

页面初始先加载真实 LLM 技术回答 Fixture，并将其复制 10 份形成超大 Markdown 基线。基线在两栏稳定后，用户开始播放
所选场景的尾部续写；指标只记录续写阶段，从而观察 Legacy 重复解析超大前缀与 Incremental 最小主线程提交之间的差异。

### 结构跳变

流式内容逐步形成强调、链接、代码围栏、表格和列表。安全尾部追加只在文本锚点明确时命中；结构发生变化时使用
Fallback HTML 或 Replace Range，优先保证最终 DOM 正确。

### 多实例压力

用户调整实例规模，同时运行多个 Markdown Renderer。所有实例共享 Worker，但拥有独立 `rendererId`、Revision、基线和
指标。销毁部分实例不会影响剩余实例，也不会在 Worker 中残留基线。

### 阅读位置保护

用户播放长文档时，Legacy 与 Incremental 默认持续显示最新输出。当用户在任意 Renderer 中向上滚动查看历史内容，该
实例立即停止自动跟随；另一个 Renderer 和其他实例仍保持各自原有行为。用户将该实例重新滚动到底部后，自动跟随恢复。

### Worker 故障降级

用户注入 Worker Crash 或请求超时。当前增量请求结束等待，页面切换到 Legacy Fallback 并继续显示完整内容；用户重置后
可以重新建立 Worker 和增量基线。

### 安全输入

用户选择恶意 HTML Fixture。两种渲染路径使用同一安全策略，脚本、事件属性和危险协议被移除，正常 Markdown 与安全链接
继续工作。

### 交互块

流式生成代码块和表格时，内容持续更新，复制和折叠工具由 React 局部挂载。工具状态不会成为文本 Patch 的落点，块被
替换或页面卸载时 React Root 正确释放。

## Edge Cases

- 空文档和仅包含换行的文档。
- Unicode、Emoji 和代理对被 Chunk 边界切开。
- 未闭合的强调、链接、代码围栏、HTML 标签和表格。
- 最后一段包含 `<strong>`、`<a>`、`<code>` 等嵌套内联节点后继续追加纯文本。
- 同一个 Patch 重复投递、乱序到达或基线 Revision 不匹配。
- Reset 与 Worker Response、RAF Commit 同时发生。
- Renderer 在请求进行中卸载。
- Clipboard API 不可用或被拒绝。
- Worker 创建失败、运行时异常、消息反序列化失败和请求超时。
- 多实例快速增删与场景切换。
- Sanitizer 处理危险标签、属性、URL 协议和畸形 HTML。
- 超大 Fixture 加载失败、重试和组件卸载时请求取消。
- 十份基线已经渲染但 Incremental Worker 尚未确认 Revision 时用户点击开始。
- 300 行以上代码块的纵向滚动与 Renderer 自动跟随同时存在。

## Out of Scope

- 接入真实 Agent SSE 或复用 Agent Stream Recovery 的会话数据。
- 替换公共 `MarkdownRenderer` 或上线为全站默认渲染器。
- 任意位置协同编辑、AST 编辑器或富文本编辑能力。
- Mermaid、数学公式、语法高亮等专项渲染引擎。
- 提取独立 npm 包或发布外部 Package。
- 服务端保存性能数据或跨设备 Benchmark。

## Tasks

- [x] 完成独立项目可行性评估与生产风险审计。
- [x] 确认 Lab 定位、路由、纯前端边界和不替换现有渲染器。
- [x] 完成目录、协议、状态机、UI 和测试技术设计。
- [x] 迁移并修正纯算法层。
- [x] 实现浏览器 Runtime、Worker 生命周期和降级策略。
- [x] 实现 React 交互块、安全策略和指标系统。
- [x] 实现 Lab 页面、场景、控制器、对比区和 Patch 日志。
- [x] 补充单元、集成与 Playwright 测试。
- [x] 同步架构、决策、用户指南与验证文档。
- [x] 执行完整工程自检与真实浏览器验证。
- [x] 实现 Renderer 实例级智能滚动跟随。
- [x] 补充滚动 Hook 单测与 Playwright 交互验证。
- [x] 创建真实 LLM 场景超长 Markdown Fixture 和 10 倍基线生成器。
- [x] 实现基线加载、稳定确认、指标重置和尾部流式续写。
- [x] 实现代码块最大高度与内部双向滚动。
- [x] 补充 Fixture、基线生命周期和大文档 Playwright 验证。
- [ ] 完成用户体验验证。
