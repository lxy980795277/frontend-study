# Markdown Isolated Benchmark · Production Report

## 1. Conclusion

在 472,763 字符 Markdown 基线之上，以 60 FPS 分批追加综合重型续写时，Web Worker 解析、块级 Diff、Single-flight
和最小 DOM Patch 组成的 Incremental 链路，相比主线程全量解析与 DOM 替换的 Legacy 链路：

- 主线程累计耗时从 `16,493.60 ms` 降至 `592.20 ms`，降低 `96.41%`，相当于 `27.85×`。
- 单次执行平均完成时间从 `5,168.70 ms` 降至 `2,144.49 ms`，降低 `58.51%`，相当于 `2.41×`。
- Commit P50 从 `13.80 ms` 降至 `9.50 ms`，降低 `31.16%`。
- Commit P95 从 `21.50 ms` 降至 `16.00 ms`，降低 `25.58%`。
- 10 轮、20 次执行的最终规范化可见文本摘要全部一致，Incremental Runtime Fallback 为 `0`。

因此，本阶段可以证明的是“主线程渲染成本降低约 96%，端到端流式完成速度提高约 2.4 倍”，不能把
`27.85×` 主线程收益表述为整个页面端到端提高 `27.85×`。

## 2. Environment

| 项目                 | 值                              |
| -------------------- | ------------------------------- |
| 日期                 | 2026-07-29                      |
| 基准代码             | `14827b6`，另增加 10 轮配置入口 |
| 构建                 | Next.js Production Build        |
| 浏览器               | HeadlessChrome 150              |
| Device Memory        | 32 GB                           |
| Hardware Concurrency | 12                              |
| Renderer 实例        | 1                               |
| 预热                 | 无                              |

浏览器 User Agent 和硬件字段来自 Benchmark 导出，不用于推断具体 CPU 型号。结果只代表本机当前浏览器和系统负载。

## 3. Protocol

| 配置          | 值                                  |
| ------------- | ----------------------------------- |
| Fixture       | `mixed`，综合重型                   |
| 原始 Markdown | 47,270 字符                         |
| 基线          | 浏览器内复制 10 份，共 472,763 字符 |
| 续写切分      | 字符，Chunk 12～32                  |
| 推送速度      | 60 FPS                              |
| Seed          | 5005                                |
| 轮次          | 10                                  |
| 正式执行      | 20，Legacy 与 Incremental 各 10     |

奇数轮按照 `Legacy → Incremental`，偶数轮按照 `Incremental → Legacy` 执行。每次执行先挂载相同的 10 倍重型基线，
等待基线 DOM Commit 后再开始续写测量。基线装载、Renderer 卸载和执行间稳定等待不进入结果。

## 4. Aggregate Results

| 指标              |       Legacy | Incremental |                   结果 |
| ----------------- | -----------: | ----------: | ---------------------: |
| Executions        |           10 |          10 |                   相同 |
| Input Frames      |        1,270 |       1,270 |                   相同 |
| Main Total        | 16,493.60 ms |   592.20 ms |       -96.41% / 27.85× |
| Main / Run        |  1,649.36 ms |    59.22 ms |                -96.41% |
| Main / Commit     |    12.987 ms |    0.471 ms |                -96.37% |
| Main Max          |     49.70 ms |     3.00 ms |                -93.96% |
| Wall Average      |  5,168.70 ms | 2,144.49 ms |        -58.51% / 2.41× |
| Wall Median       |  5,077.00 ms | 2,139.30 ms |                -57.86% |
| Wall CV           |        3.01% |       0.84% |     Incremental 更稳定 |
| Commit Average    |    15.408 ms |   11.164 ms |                -27.54% |
| Commit P50        |     13.80 ms |     9.50 ms |                -31.16% |
| Commit P95        |     21.50 ms |    16.00 ms |                -25.58% |
| Commit Max        |     62.30 ms |    56.70 ms |                 -8.99% |
| DOM Commits       |        1,270 |       1,257 | 13 帧未形成独立 Commit |
| Coalesced Frames  |            0 |          21 |    主动覆盖过时 Target |
| Runtime Fallbacks |            — |           0 |   未降级为全量 Runtime |

`DOM Commits` 与 `Coalesced Frames` 来自不同层级的观测点，不能用两者的差值互相推导。最终内容和最终长度均通过一致性校验。

## 5. Paired-Round Stability

逐轮将相同 Round 的 Legacy 与 Incremental 配对：

| 指标           | 中位数 | 最小值 | 最大值 |
| -------------- | -----: | -----: | -----: |
| Main Speedup   | 27.71× | 24.87× | 30.15× |
| Main Reduction | 96.39% | 95.98% | 96.68% |
| Wall Speedup   |  2.38× |  2.31× |  2.51× |
| Wall Reduction | 57.94% | 56.71% | 60.20% |

主线程降低比例的轮间标准差为 `0.21` 个百分点，Wall Speedup 的变异系数为 `2.96%`，说明收益不是由单轮异常值产生。

执行顺序影响较小：

- Legacy 首位执行 Wall Mean 为 `5,188.86 ms`，次位执行为 `5,148.54 ms`，相差 `0.78%`。
- Incremental 首位执行 Wall Mean 为 `2,138.34 ms`，次位执行为 `2,150.64 ms`，相差 `0.57%`。

奇偶轮交替有效降低了固定先后顺序对结论的影响。

## 6. Worker and Long Tasks

Incremental 10 轮累计：

- Worker Parse：`5,937.10 ms`
- Worker Diff：`35.20 ms`
- Main-thread Patch Apply：`442.60 ms`
- React Tools Mount：`149.60 ms`
- Worker Requests：`1,257`
- Runtime Fallbacks：`0`

Worker 计算没有消失，而是从主线程迁移到后台线程；这也是主线程收益约 `27.85×`，但端到端收益约 `2.41×` 的主要原因。

Long Tasks：

| 指标  | Legacy | Incremental |
| ----- | -----: | ----------: |
| Count |      7 |           9 |
| Total | 454 ms |      484 ms |
| Max   |  86 ms |       60 ms |

Incremental 的最大 Long Task 降低 `30.23%`，但数量和累计时长没有改善。本次数据不能支持“Long Task 总量显著下降”的结论。
Long Tasks API 观察的是测量窗口内整个页面主线程，包含布局、绘制、GC 和浏览器任务，不等同于 Renderer 函数采样。

## 7. Interpretation

主要收益来自整条增量链路，而不是单独来自 Web Worker：

1. Legacy 每个输入帧都在主线程重新解析、净化并替换约 47 万字符文档。
2. Incremental 在 Worker 内解析并维护 Revision，主线程只提交发生变化的块。
3. Single-flight 在 Worker 忙碌时覆盖已经过时的中间 Target，但保留最终状态。
4. React Tools 只针对代码块和表格局部挂载，不参与正文 Patch。
5. 两条路径都以最终 DOM Commit 为完成点，避免把“Streamer 已发送完成”误报为渲染完成。

Commit P50/P95 的收益小于主线程函数耗时收益，因为端到端延迟还包含 60 FPS 调度、Worker Message、RAF、React Commit、
布局和绘制。

## 8. Resume-safe Statement

推荐使用以下表述：

> 面向约 47 万字符 Markdown 的 60 FPS 流式续写场景，设计 Web Worker 解析、块级 Diff、Single-flight 与最小
> DOM Patch 渲染链路；在 Production Chromium 10 轮隔离基准中，将主线程渲染耗时降低 96.4%，端到端完成时间降低
> 58.5%，并保持最终内容一致。

该表述包含输入规模、运行环境、样本轮次、指标口径和正确性边界，不把主线程收益夸大为整体收益。

## 9. Raw Artifact

- [原始 Benchmark JSON](./artifacts/20260729-production-heavy-10-rounds.json)
- SHA-256：`025810ecb505070118f4653f56dee8314d71c15f1ef1db316427c0d91251d10d`
- Schema Version：`1`
- Generated At：`2026-07-29T12:14:34.671Z`

原始文件保留全部 20 次 Execution、每帧 Commit Latency Sample、环境、配置、逐轮指标、汇总和内容摘要。
