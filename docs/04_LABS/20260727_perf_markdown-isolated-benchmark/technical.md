# Markdown Isolated Benchmark · Technical Design

## 1. Problem Definition

当前双栏页面在同一主线程、同一渲染帧和同一内存空间中同时执行 Legacy 与 Incremental：

```text
Stream Frame
├── Legacy: parse + sanitize + full DOM replace
└── Incremental: worker response + patch apply + React tools
```

其中任一侧产生长任务，都会推迟另一侧的 Timer、RAF、Worker Message 和 React Commit。因此双栏结果能回答“两个实现共存时
发生了什么”，不能回答“单独运行某个实现需要多少成本”。

本方案在页面内使用串行单挂载实现浏览器文档级隔离：

```text
round 1 Legacy → unmount → settle → Incremental → unmount → settle
round 2 Incremental → unmount → settle → Legacy → unmount → settle
```

它不能消除浏览器进程、JIT 和系统负载的全部噪声，但能消除同一时刻两个 Renderer 的直接主线程竞争，是交互式 Lab 中可靠且
可解释的性能口径。需要更强隔离时，后续使用 Playwright 在独立 Page/Context 中自动运行同一套计划。

## 2. UI Tree

```text
MarkdownStreamRenderingLab
├── LabDetailHeader
├── ModeTabs (URL controlled)
│   ├── 同步对比
│   └── 隔离基准
├── ConcurrentComparison [mode=compare]
│   ├── ControlBar
│   ├── CoexistenceNotice
│   ├── ComparePane
│   └── RuntimePanel / PatchLog
└── IsolatedBenchmark [mode=benchmark]
    ├── BenchmarkConfiguration
    │   ├── Scenario
    │   ├── FPS
    │   ├── SplitMode
    │   ├── InstanceCount = 1
    │   └── RoundCount = 1 / 2 / 3 / 5 / 10
    ├── BenchmarkActions
    ├── BenchmarkWorkspace (fixed size)
    │   ├── Progress
    │   ├── ActiveRendererHost (only one child)
    │   └── LiveMetrics
    └── BenchmarkReport
        ├── SummaryCards
        ├── Consistency
        ├── PerRoundTable
        └── ExportJson
```

模式组件互斥挂载。切回同步对比时隔离 Runner 会先清理；Benchmark 正在运行时 Tabs 禁用，避免无提示中断。

## 3. Directory

```text
labs/markdown-stream-rendering/
├── benchmark/
│   ├── plan.ts
│   ├── statistics.ts
│   ├── report.ts
│   ├── types.ts
│   └── __tests__/
├── browser/
│   ├── long-task-monitor.ts
│   └── ...
├── components/
│   ├── markdown-stream-rendering-lab/index.tsx
│   ├── concurrent-comparison/index.tsx
│   ├── isolated-benchmark/index.tsx
│   ├── benchmark-configuration/index.tsx
│   ├── benchmark-workspace/index.tsx
│   ├── benchmark-report/index.tsx
│   ├── single-renderer-host/index.tsx
│   └── ...
├── hooks/
│   ├── use-isolated-benchmark.ts
│   └── ...
└── metrics/
    └── ...
```

纯计划与统计放在 `benchmark/`，不依赖 React 或 DOM。浏览器观察器放在 `browser/`。Runner 生命周期放在 Hook，组件只处理
配置和展示。

## 4. Mode Routing

```ts
type LabMode = 'compare' | 'benchmark';

function parseLabMode(value: string | null): LabMode {
  return value === 'benchmark' ? 'benchmark' : 'compare';
}
```

模式切换使用 `router.replace` 更新当前路径的 `mode` Query，并保留其他合法 Query。页面入口用 `Suspense` 包住读取
`useSearchParams` 的 Client Component，确保 Next.js 静态构建不触发 CSR Bailout。

## 5. Benchmark Model

```ts
type RendererKind = 'legacy' | 'incremental';

interface BenchmarkConfiguration {
  fixtureId: FixtureId;
  fps: number;
  splitMode: SplitMode;
  instanceCount: 1;
  roundCount: number;
}

interface BenchmarkExecution {
  id: string;
  renderer: RendererKind;
  round: number;
  order: number;
}

interface BenchmarkPlan {
  configuration: BenchmarkConfiguration;
  executions: BenchmarkExecution[];
}
```

`createBenchmarkPlan()` 是确定性纯函数：

1. 不创建额外 Warmup，所有 Execution 都是报告样本。
2. `round=1` 使用 Legacy、Incremental。
3. `round=2` 使用 Incremental、Legacy。
4. 后续重复奇偶交替。
5. 每个 Execution ID 由 round、renderer 和 order 组成，不使用随机值。

## 6. Runner State Machine

```text
idle
  └── start → loading-baseline / preparing

preparing
  ├── mount active renderer with baseline
  ├── wait baseline commit
  └── measuring

measuring
  ├── collector.reset + longTask.start
  ├── stream deterministic frames
  ├── wait final DOM commit
  └── snapshot result → cleaning

cleaning
  ├── stop stream / observer
  ├── unmount active renderer
  ├── two RAF + idle callback
  └── next execution ? preparing : completed

any active state
  └── stop/unmount → cancelling → idle/stopped
```

Runner 使用单调递增 `runToken`。每个异步边界恢复后先校验 Token；过期执行不得更新状态或启动下一执行。所有取消句柄集中在
Ref 中，不依赖异步闭包中的旧 React State。

## 7. Single Renderer Contract

`SingleRendererHost` 只接受一个 `renderer`：

```ts
interface RendererCommit {
  renderer: RendererKind;
  contentLength: number;
  committedAt: number;
}
```

- Legacy 在 `markdown-it → sanitize → innerHTML` 完成后报告 Commit。
- Incremental 在 Patch Apply、Tools Mount 和 Worker Commit 完成后报告 Commit。
- Host 在 `contentLength === expectedFinalLength` 时，从当前 Renderer 容器读取规范化可见文本并计算摘要。
- 读取范围只包含 `.msr-content` 或 Fallback Content，不包含复制、折叠等 Tools 文案。
- 每次 Execution 通过不同 React `key` 强制建立全新 Renderer 生命周期。

`contentLength` 只用于关联输入帧和识别最终 Commit；一致性使用可见文本摘要，不把输入一致误报为渲染一致。

## 8. Stream and Commit Correlation

Runner 为每个已发出 Frame 保存：

```ts
interface EmittedFrame {
  index: number;
  cumulativeLength: number;
  emittedAt: number;
}
```

Commit 到达后，以 `cumulativeLength` 匹配最近的对应 Frame：

- Legacy 通常每帧 Commit 一次。
- Incremental 可能 Single-flight 合并中间 Target，因此只有实际提交的 Target 产生端到端延迟样本。
- `inputFrames - domCommits` 不直接等于 Coalesced Frame；报告优先使用 Incremental Runtime 自身的
  `coalescedFrames`，并单独展示未形成 Commit 的输入数量。
- 最终 Commit 必须命中 `expectedFinalLength`，否则 Execution 不得结束。

## 9. Timing and Metrics

### Main-thread Execution

沿用现有 Collector：

- Legacy Sample：Parse、Sanitize 和 Full DOM Replace 的同步总时长。
- Incremental Sample：Patch Apply 和 React Tools Mount 的同步总时长。
- Worker Parse/Diff 保持独立展示，不混入主线程总耗时。

### Frame Commit Latency

```text
latency = rendererCommittedAt - frameEmittedAt
```

汇总：

- P50：最近秩百分位，代表典型 Commit 延迟。
- P95：尾部 Commit 延迟。
- Average：所有实际 Commit 样本均值。
- Max：最差实际 Commit。

### Wall Time

```text
wallMs = finalDomCommittedAt - firstFrameEmittedAt
```

不包含基线装载、Renderer 卸载和执行间稳定时间。

### Long Tasks

`PerformanceObserver({ entryTypes: ['longtask'] })` 只在每次测量期间开启：

- 不支持时结果标记 `supported=false`，不伪造为 0。
- 完成时先读取 `takeRecords()`，再断开 Observer。
- 保存 count、totalMs 和 maxMs。

### Aggregation

每种 Renderer 跨轮次聚合：

- 主线程 total/average/max。
- Commit Latency P50/P95/average/max。
- Wall Time average/min/max。
- Long Task count/total/max。
- Input Frames、DOM Commits、Worker Requests、Coalesced Frames 总数。

逐轮结果仍完整保留，以检查执行顺序偏差和离群值。

## 10. Execution Baseline and Settling

基准不执行预热。每次执行都会先挂载同一份 10 倍重型 Markdown 基线并等待 DOM Commit，然后在该已有文档之上分批追加同一份
确定性续写。基线建立过程不进入续写指标，分批追加从第一帧开始计时，所有轮次结果都进入报告。

每次执行结束后：

1. 停止 Streamer 并断开 Observer。
2. 把 Active Execution 设为 `null`，卸载 Renderer。
3. 等待两个 `requestAnimationFrame`。
4. 使用 `requestIdleCallback` 等待空闲；不支持时退化为零延迟 Timer。
5. 校验 Run Token 后进入下一 Execution。

稳定等待不计入某个 Renderer 的性能结果。

## 11. Report and Export

```ts
interface BenchmarkReport {
  schemaVersion: 1;
  status: 'completed' | 'stopped';
  generatedAt: string;
  environment: {
    userAgent: string;
    hardwareConcurrency: number | null;
    deviceMemoryGb: number | null;
  };
  configuration: BenchmarkConfiguration;
  executions: BenchmarkExecutionResult[];
  summary: Record<RendererKind, RendererSummary>;
  consistency: {
    passed: boolean;
    legacyHashes: string[];
    incrementalHashes: string[];
  };
}
```

导出使用 Blob/Object URL，文件名包含时间戳。下载完成立即 Revoke URL。未完成任务可以导出 `stopped` 报告，但 UI 必须明确
样本不完整，不能与完整报告混淆。

## 12. Cancellation and Cleanup

统一 Cleanup 包含：

- Streamer `stop()`。
- 取消待执行 RAF、Idle Callback 和 Timer。
- Long Task Observer `disconnect()`。
- Active Renderer 卸载。
- Incremental Runtime `dispose()`、Worker Handler 注销和 Tools React Root 卸载。
- 清空等待 Commit 的 Resolver。

停止不是错误状态。Renderer Error、基线加载失败、最终 Commit 超时或内容摘要不一致则进入可读 Error/Failed 状态，并保留
已完成结果供诊断。

## 13. Testing Matrix

### Unit

- 奇偶轮执行计划和稳定 ID。
- Percentile、空样本、单样本和多轮聚合。
- Legacy/Incremental 最终摘要一致与不一致。
- Stopped 与 Completed Report 序列化。
- 不支持 Long Tasks API 时的结果。

### Component

- 非法 Query 回退 compare。
- 运行中 Tabs 和配置禁用。
- 停止后 Renderer 卸载。
- 任意时刻只有一个 Renderer Host。
- 最后一帧发出后、最终 Commit 前不得完成。

### Playwright

- 默认同步对比与 `?mode=benchmark` 深链。
- 使用短场景、最高速度、最少轮次完成真实串行任务。
- 断言执行顺序、单 Renderer DOM 和完成报告。
- 断言 JSON 下载。
- 运行中停止，页面可重新配置并重新开始。
- 控制台无 Error、React Warning 或未处理 Promise。

## 14. Production Reference Benchmark

模块收尾时使用 Production Build、综合重型场景、472,763 字符基线、60 FPS 字符切分和 10 轮交替执行建立参考结果。
该任务不执行预热，Legacy 与 Incremental 各获得 10 个正式样本，20 次执行的最终可见文本摘要一致。

完整环境、协议、聚合结果、逐轮配对分布、执行顺序偏差、Long Task 边界和原始 JSON 见
[`benchmark-report.md`](./benchmark-report.md)。

参考结果只用于说明当前设备和输入下的实现差异，不建立跨设备固定阈值，也不进入 CI 性能门禁。

## 15. Alternatives

### 继续双栏并单独计时

不能消除长任务和帧调度互相影响，只改变统计标签，不解决测量污染。

### CSS 隐藏非当前 Renderer

隐藏节点仍可能保留 Worker、Effect 和 React Runtime，不构成生命周期隔离。

### iframe

可以隔离 DOM 和部分全局状态，但仍共享 UI 主线程，通信和样式基线更复杂，首版收益有限。

### 两个 Playwright Page

自动化报告的隔离更强，适合后续标准基准；但不适合作为用户在 Lab 页面中即时理解和操作的唯一交互。

## 16. Transferable Conclusion

性能对比必须把“功能并排展示”和“独立基准测量”拆成两个实验协议。前者追求同帧可观察性，后者追求生命周期、输入、顺序和
指标口径的公平性。对流式 UI 而言，完成时刻应由最终 DOM Commit 决定，而不是由网络或 Streamer 的最后一帧决定。
