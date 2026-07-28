# Markdown Stream Rendering · Technical Design

## 1. Decision Summary

本 Lab 保留原 `markdown-kit` 的双栏对比，但重新定义生产边界：

- Legacy：同一输入帧到达后，在主线程执行 `markdown-it render → DOMPurify → innerHTML`。
- Incremental：同一输入帧到达后，只保存最新 Target；Worker 计算块级 Patch，主线程按 Revision 最小提交。
- 输入流本身已经提供逐步输出，不再叠加第二套 Typewriter 拆帧，避免 Legacy 与 Incremental 采样口径失真。
- Worker 忙碌时合并中间 Target，只处理最新累积全文，并单独统计 Coalesced Frame。
- Incremental 失败时切换到与 Legacy 相同的安全全量渲染，保证内容可见。

## 2. Directory

```text
apps/web/src/
├── public/fixtures/markdown-stream-rendering/
│   └── llm-benchmark.md
├── app/labs/(detail)/markdown-stream-rendering/
│   └── page.tsx
├── config/lab-registry.ts
├── components/ui/
│   ├── select/index.tsx
│   └── slider/index.tsx
└── labs/markdown-stream-rendering/
    ├── components/
    │   ├── markdown-stream-rendering-lab/index.tsx
    │   ├── control-bar/index.tsx
    │   ├── compare-pane/index.tsx
    │   ├── renderer-panel/index.tsx
    │   ├── legacy-renderer/index.tsx
    │   ├── incremental-renderer/index.tsx
    │   ├── metrics-panel/index.tsx
    │   ├── patch-log/index.tsx
    │   ├── runtime-panel/index.tsx
    │   ├── stick-to-bottom-viewport/index.tsx
    │   └── block-tools/index.tsx
    ├── core/
    │   ├── diff/
    │   │   ├── blocks.ts
    │   │   ├── diff.ts
    │   │   ├── signature.ts
    │   │   └── split-blocks.ts
    │   ├── patch/
    │   │   ├── generate.ts
    │   │   └── types.ts
    │   └── __tests__/
    ├── browser/
    │   ├── apply-patches.ts
    │   ├── block-tools-manager.ts
    │   ├── incremental-renderer.ts
    │   ├── worker-host.ts
    │   └── __tests__/
    ├── worker/
    │   ├── markdown-parser.ts
    │   ├── markdown-worker.ts
    │   └── protocol.ts
    ├── fixtures/
    │   ├── benchmark.ts
    │   ├── fixtures.ts
    │   ├── seeded-random.ts
    │   └── streamer.ts
    ├── metrics/
    │   ├── collector.ts
    │   └── types.ts
    ├── security/
    │   ├── sanitize.ts
    │   └── __tests__/
    ├── services/
    │   └── benchmark.ts
    └── hooks/
        ├── use-benchmark-baseline.ts
        ├── use-markdown-stream-lab.ts
        └── use-stick-to-bottom.ts
```

组件仍使用目录 `index.tsx`；算法、协议和 Runtime 使用职责明确的 kebab-case 文件，不增加 Barrel。

## 3. Layering

### Pure Algorithm

`core/` 只处理数据：

- Markdown Block、签名、块级 Diff。
- Patch 数据结构和生成。
- 不读取 `window`、`document`、React、Next.js 或模块外 Store。

### Worker Compute

`worker/` 负责：

- `markdown-it` 解析和顶层 Block 分组。
- 为新 Block 继承或生成稳定 `blockId`。
- 按 Renderer 保存 Confirmed Baseline 与单个 Pending Revision。
- 只在收到主线程 `commit` 后推进 Confirmed Baseline。

### Browser Runtime

`browser/` 负责：

- Worker 单例、Handler 路由、Timeout、Crash 和资源释放。
- Revision 校验与 Patch Apply。
- RAF 合帧和最新 Target 合并。
- React Tools Root 的挂载与清理。
- Worker 失败后的安全 Full Render Fallback。

### React View

`components/` 和 `hooks/` 只负责实验交互、视图状态和指标展示，不实现 Diff 或 Patch 算法。

## 4. Block Model

```ts
interface MarkdownBlock {
  blockId: string;
  html: string;
  kind: BlockKind;
  needsTools: boolean;
  signature: number;
  source: string;
}
```

稳定身份规则：

1. 完全相同的前后缀 Block 继承旧 `blockId`。
2. 最后一个 Block 保持同类型且 Source 为纯追加时继承旧 `blockId`。
3. 新结构创建新的单调递增 `blockId`。
4. Block 删除后对应 React Root 和交互状态被释放。

## 5. Worker Protocol

### Request

```ts
type WorkerRequest =
  | {
      type: 'update';
      rendererId: string;
      reqId: number;
      baseRevision: number;
      nextRevision: number;
      content: string;
    }
  | {
      type: 'commit';
      rendererId: string;
      revision: number;
    }
  | {
      type: 'reset';
      rendererId: string;
    }
  | {
      type: 'simulate-crash';
      rendererId: string;
    };
```

### Response

```ts
type WorkerResponse =
  | { type: 'patch'; payload: PatchResult }
  | { type: 'protocol-error'; rendererId: string; reqId: number; reason: string };
```

Worker State：

```text
rendererId
├── confirmed { revision, blocks }
└── pending   { revision, blocks } | null
```

处理顺序：

```text
update(baseRevision=N, nextRevision=N+1)
  → 校验 confirmed=N 且 pending 为空
  → 计算 Patch
  → 保存 pending=N+1
  → 返回 PatchResult

主线程 apply 成功
  → commit(N+1)
  → pending 提升为 confirmed

主线程 apply 失败
  → reset
  → Full Render Fallback
```

## 6. Patch Protocol

```ts
interface PatchResult {
  baseRevision: number;
  nextRevision: number;
  rendererId: string;
  reqId: number;
  patches: Patch[];
  metrics: WorkerMetrics;
}
```

Patch：

- `replaceRange`：删除块范围并插入完整 Block Snapshot。
- `tailAppendText`：携带旧/新签名、稳定 `blockId`、文本目标和完整 Fallback Snapshot。
- `tailAppendFallbackHtml`：结构跳变时替换最后一个 Block Snapshot。

Apply 前置条件：

1. 容器 Revision 等于 `baseRevision`。
2. 目标 Block ID 与旧签名匹配。
3. 容器已经是 `nextRevision` 时视为重复投递并 No-op。
4. 文本 Target 缺失时使用 Patch 自带的完整 Snapshot，不猜测 DOM 落点。

DOM Block：

```html
<div class="msr-block" data-block-id="..." data-signature="...">
  <div class="msr-content">Markdown HTML</div>
  <div class="msr-tools">React Root</div>
</div>
```

正文和工具节点从结构上隔离。段落/标题追加到 Content 的首个块级根节点；代码追加到 `pre > code`。不再使用
`deepestLastElement`。

## 7. Scheduling State

```text
idle
  └── push(target) → requesting

requesting
  ├── push(newerTarget) → requesting + pendingTarget 覆盖
  ├── patch → applying
  ├── timeout → fallback
  └── workerError → fallback

applying
  ├── success → commit → pendingTarget ? requesting : idle
  └── applyError → reset → fallback

fallback
  ├── push(target) → safe full render
  └── reset → idle + 新 Worker Baseline
```

每个 Renderer 同时只允许一个 Worker Request。Target 合并不会丢最终内容，合并数量通过 Metrics 记录。

## 8. Deterministic Stream

Streamer 使用 Seeded PRNG：

```text
fixture content + seed + fps + chunkRange + splitMode
  → 确定的 StreamFrame[]
```

同一个 Run 只创建一组 Frame，并同时分发给左右两栏。切换速度只改变调度间隔，不改变已生成的 Chunk 边界。

Fixture：

- Plain：长段落和 Unicode。
- Inline：强调、链接、行内代码后继续追加文本。
- Code：未闭合/闭合 Fence 和多个代码块。
- Table：表头形成、分隔行出现和多行追加。
- Mixed：列表、引用、链接、代码、表格与长文本。
- Unsafe：脚本、事件属性和危险协议。

### 超大 Benchmark 基线

静态数据源放在 `public/fixtures/markdown-stream-rendering/llm-benchmark.md`。它是浏览器可缓存的公共静态资源，不创建
NestJS API，也不进入数据库或 Redis。

原始 Markdown 约束：

- 模拟一次真实 LLM 对“生产级流式前端架构”的长篇回答。
- 包含多级标题、正文、引用、链接、行内代码、有序/无序列表和表格。
- 至少两个 fenced code block，每个 block 的内部源码不少于 300 行。
- 原始文件只保存一份语义完整内容。

基线生成：

```text
source.md
  → inspectBenchmarkMarkdown()
  → createBenchmarkBaseline(source, copies=10)
  → source + "\n\n---\n\n" + source ... ×10
  → immutable baseline string
```

Builder 是纯函数，复制次数固定为 10；副本之间使用 Markdown Horizontal Rule 分隔，不注入随机 ID，不改变两栏输入。

### Benchmark 生命周期

```text
loading
  ├── static md success → preparing
  └── failure → error → retry → loading

preparing
  → measuring=false
  → content=baseline×10
  → Legacy 同步完成
  → 每个 Incremental Renderer 回报 committedContentLength=baseline.length
  → ready

ready
  → 用户 Start
  → collector.reset()
  → measuring=true
  → createStreamFrames(continuation, initialContent=baseline)
  → running

running
  ├── Pause → paused
  ├── complete → completed
  └── Reset/Scenario/Scale change → preparing

completed
  → 再次运行时先回到 preparing
  → 基线重新确认后自动进入 running
```

`RuntimeStatus` 增加 `committedContentLength`。Incremental Renderer 只有在 Patch Apply、React Tools Mount 和 Worker
Commit 全部完成后才上报该值；Fallback Full Render 完成后也上报当前长度。这样“基线已准备”不依赖 Timer 或猜测。

测量隔离：

- `measuring=false` 时仍保存 Runtime Status，但不记录 Legacy/Incremental Sample、Worker Request、Patch Log 或
  Runtime Fallback 指标。
- Start 时原地清空 Collector 和 Patch Log，不修改 Renderer、DOM、Worker Baseline 或 Revision。
- Streamer 只拆分续写 Fixture，`StreamFrame.cumulative` 为 `baseline + separator + continuationCumulative`。
- Reset 和场景切换先停止 Streamer、关闭测量并重新建立相同基线。

该 Benchmark 证明的是“超大历史上下文上的主线程响应差异”。Incremental Worker 当前仍会解析完整累计 Markdown，
所以 Worker Parse 必须继续单独展示，不把主线程收益描述为总计算量收益。

### Fixture 加载

`services/benchmark.ts` 统一执行静态文本 Fetch、状态码判断和 Abort；`use-benchmark-baseline.ts` 管理
`loading/ready/error`、Retry 和卸载取消。

- Loading：对比区显示基线准备状态，控制台不可启动。
- Error：显示可读错误和 Retry，禁止进入空基线测试。
- Preparing：两栏可以展示正在建立的基线，但 Start 保持禁用。
- Ready：显示 `Baseline ×10`、字符数和代码块数量。

不使用 `base-request`，因为它的成功响应契约是 JSON；静态 Markdown Service 返回 `response.text()`，但仍遵守所有网络
访问放入 Service 的规则。

## 9. Metrics

共享 Run Metrics：

- `inputFrames`
- `elapsedMs`

Legacy：

- `commits`
- `mainTotalMs`
- `mainAverageMs`
- `mainMaxMs`

Incremental：

- `workerRequests`
- `workerParseMs`
- `workerDiffMs`
- `patchCommits`
- `patchApplyMs`
- `reactMountMs`
- `coalescedFrames`
- `tailAppendRate`
- `fallbackPatchRate`
- `runtimeFallbacks`

UI 不把 Worker 耗时和主线程耗时直接相加为“总耗时”。收益倍数只比较相同口径的主线程累计/均值/峰值。

同步对比模式的 Legacy 与 Incremental 同时挂载、同时消费 Stream Frame，因此这里的指标描述的是“双栏共存负载”：
Legacy 主线程任务会延迟 Incremental 的消息派发和 DOM Patch，Incremental 提交也会与 Legacy 竞争主线程、布局、
绘制和 GC。函数内 `performance.now()` 采样仍是真实执行区间，但不能解释为任一方案独立运行时的端到端性能。页面新增
`mode=benchmark` 串行隔离基准；完整设计和指标口径见
`docs/04_LABS/20260727_perf_markdown-isolated-benchmark/technical.md`。双栏继续用于内容一致性、Patch 行为、降级和
共存压力观察。

## 10. Layout

### Desktop

```text
Lab Detail Main (100dvh, overflow hidden)
├── Header (shrink-0)
├── Control Bar (shrink-0, wrap)
└── Workspace (min-h-0, flex-1, 2 columns)
    ├── Compare Card (min-w-0, min-h-0)
    │   └── 2 equal renderer columns
    │       ├── Legacy Header + local scroll viewport
    │       └── Incremental Header + local scroll viewport
    └── Inspector Card (fixed responsive width)
        ├── Metrics Tab
        └── Patch Log Tab + local scroll viewport
```

### Tablet / Mobile

- Workspace 改为纵向文档流，允许页面纵向滚动。
- 双栏在中等宽度保持两列；窄屏改为上下两块。
- 每个 Renderer Viewport 设置明确高度并独立滚动。
- 所有 Grid Child 使用 `min-w-0`，Markdown 使用 `overflow-wrap:anywhere`。
- Code 和 Table 仅在自身 Content Host 内横向滚动，禁止撑宽页面。
- Control Bar 使用 Wrap，不使用固定最小宽度。

桌面不出现 Body 级滚动；长 Markdown、Metrics 和 Patch Log 只在各自 Viewport 内滚动。

### Renderer 智能滚动

滚动跟随放在 Renderer Viewport 层，不侵入 Legacy 和 Incremental 的解析、Patch 或指标逻辑：

```text
RendererPanel
└── instance article
    ├── instance header
    └── StickToBottomViewport
        └── content host
            └── LegacyRenderer | IncrementalRenderer
```

每个 `StickToBottomViewport` 创建独立 Hook 实例：

```text
initial
  └── following = true

scroll
  ├── following && distanceFromBottom > 48px → paused
  ├── paused && distanceFromBottom <= 16px → following
  └── 其他情况保持当前状态

DOM Mutation / Content Resize
  ├── following → 合并到唯一 RAF → 再次确认 following → scrollTop = scrollHeight
  └── paused → 保持用户阅读位置

Reset / Scenario / Instance rebuild
  └── runId 更新 → Viewport 重建 → following = true
```

使用进入阈值 16px、离开阈值 48px形成迟滞区间，避免字体布局、小数像素和浏览器取整导致状态来回切换。
自动跟随使用即时滚动，不使用 `smooth`；高频 Token 流中的平滑动画会不断取消并重启，产生延迟和视觉抖动。

DOM 提交检测：

- `MutationObserver` 观察 Renderer Content Host 的 `childList/characterData/subtree`，同时覆盖 Legacy
  `innerHTML`、Incremental Patch 和 Full Render Fallback。
- 可用时使用 `ResizeObserver` 捕获图片、字体或交互块引起的异步高度变化。
- Mutation 与 Resize 共用一个待执行 RAF；新的请求先取消旧 RAF，组件卸载时释放 Observer、Listener 和 RAF。
- RAF 真正执行前再次读取 `following`，防止用户在调度后、执行前向上滚动却被抢回底部。
- Scroll Listener 使用 Passive 模式，只更新 Ref，不触发 React Render。

滚动数据流：

```text
StreamFrame
  → Legacy innerHTML / Incremental DOM Patch
  → Observer
  → scheduleFollow()
  → requestAnimationFrame
  → followingRef?
      ├── yes → viewport.scrollTop = viewport.scrollHeight
      └── no  → no-op

User Scroll
  → distanceFromBottom
  → hysteresis state transition
  → followingRef
```

## 11. UI

Header：

- 标题、生产边界说明、当前 Runtime Mode。

Control Bar：

- Play/Pause、Reset。
- Scenario Select。
- 推送速度 Slider（5–60 FPS，默认值根据超大基线调整，修改后立即作用于 Streamer）。
- Char/Token Split。
- Instance Scale：1 / 4。
- Worker Failure 注入。
- Baseline Loading/Preparing 时禁用运行操作，Error 时提供 Retry。

Compare：

- Legacy 和 Incremental 保持同宽。
- 每栏展示提交数、运行模式和实例数量。
- 多实例在栏内纵向排列，每个实例拥有独立滚动块。

Inspector：

- Metrics：同口径对比和 Worker/Patch 明细。
- Patch Log：Request、Revision、Operation、Block。
- Runtime：Worker 状态、Coalesced、Fallback 原因。

## 12. Test Strategy

### Unit

- cyrb53 稳定性。
- 顶层 Token 分组。
- 前后缀 Diff。
- Plain Append、Nested Inline、Code、Table 和 Replace Range Patch。
- Revision 重放、乱序和基线冲突。
- Content/Tools Host 隔离与 Tail Target。
- DOMPurify XSS。
- Seeded Stream 可复现。
- Metrics 采样口径。
- 智能滚动的底部距离、迟滞状态转换、RAF 合并和卸载清理。

### Playwright

- Labs 卡片进入模块。
- Play/Pause/Reset 与场景切换。
- Legacy/Incremental 最终文本一致。
- Code/Text 不进入 Tools Host。
- Worker Failure 后进入 Fallback 且继续完成。
- 1/4 实例切换。
- Desktop 无 Body 横向滚动，Compare/Inspector 局部滚动。
- Mobile 双栏改为纵向，页面无横向溢出。
- Legacy 与 Incremental 默认跟随最新内容。
- 用户向上滚动后阅读位置不被新增内容抢占。
- 回到底部后恢复跟随，1×/4× 实例状态互相隔离。
- 静态 Markdown 加载成功、失败、重试和卸载取消。
- Builder 固定生成 10 份完全相同基线，并验证每个代码围栏不少于 300 行。
- 基线准备阶段指标保持为零，开始流式续写后才进入测量。
- 初始两栏内容一致，代码块最大高度生效且内部可纵向/横向滚动。

### Manual Production Verification

- 使用 Production Build 连续运行 Mixed 场景三轮。
- 记录设备、浏览器、Fixture、FPS、Chunk、实例数和实际指标。
- Verify 只记录真实结果，不预设倍数。

## 13. Tasks

- [x] 完成 Spec 与生产风险审计。
- [x] 完成目录、协议、状态机、数据流、布局和测试设计。
- [x] 接入依赖、路由、Registry 和 shadcn 控件。
- [x] 实现 Core、Worker、Runtime、Security 和 Metrics。
- [x] 实现双栏页面、交互块和响应式局部滚动。
- [x] 补充 Unit 与 Playwright。
- [x] 同步架构、决策和用户指南。
- [x] 完成完整工程自检与 Production Browser 验证。
- [x] 实现实例级 `use-stick-to-bottom` 与统一滚动 Viewport。
- [x] 补充迟滞状态、Observer/RAF 生命周期单测。
- [x] 补充自动跟随、暂停、恢复和多实例隔离 Playwright。
- [x] 创建超长 `.md` Fixture、结构校验和 10 倍纯函数 Builder。
- [x] 实现静态 Fixture Service、Loading/Error/Retry 和 Abort。
- [x] 实现 Benchmark 生命周期、Revision 就绪信号和指标隔离。
- [x] 让 Streamer 基于十倍基线只拆分尾部续写。
- [x] 实现代码块最大高度和双向内部滚动。
- [x] 补充 Baseline Unit、Service、Hook 与 Playwright 验证。
- [x] 完成当前双栏版本体验验证并记录 Verify。
- [x] 增加 Legacy / Incremental 串行隔离 Benchmark，避免两条渲染链路互相污染独立性能结果。
