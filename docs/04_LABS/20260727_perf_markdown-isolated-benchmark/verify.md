# Markdown Isolated Benchmark Verification

## 1. Result

Markdown 流式渲染隔离基准通过。同步对比继续承担内容一致性、Patch、降级、滚动和共存压力观察；隔离基准使用同一
10 倍重型 Markdown 基线，串行挂载单个 Renderer，并在已有大文档上分批追加确定性续写。

隔离基准不执行额外预热任务。默认 2 轮共生成 4 次正式执行，顺序为
`Legacy → Incremental → Incremental → Legacy`，4 次结果全部进入报告。

## 2. Functional Coverage

- `mode=compare` 与 `mode=benchmark` 由 URL Query 驱动，非法值回退同步对比。
- 同步对比与隔离基准互斥挂载，运行期间模式和配置被锁定。
- 每次隔离执行只挂载一个 Renderer，完成后卸载并等待浏览器帧与空闲阶段稳定。
- Legacy 与 Incremental 使用相同基线、续写内容、Seed、Chunk、FPS 和固定工作区尺寸。
- 测量从第一帧续写发出开始，到最终内容已经提交到 DOM 后结束。
- 支持停止未完成任务并生成 `stopped` 报告，不残留 Streamer、Observer 或 Renderer。
- 报告包含主线程耗时、Commit P50/P95/最大值、Wall Time、Long Task、调度计数和逐轮明细。
- 最终一致性使用规范化可见文本摘要校验，并支持导出完整 JSON。

## 3. Automated Verification

完整工程检查通过：

```text
pnpm check:structure
pnpm format:check
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm knip
git diff --check
```

测试结果：

- Web：18 个测试文件，50 条测试通过。
- Server：10 个测试文件，22 条测试通过。
- Playwright：原有 13 条 Chromium 场景通过。
- Next.js 与 NestJS Production Build 通过。
- Knip 无阻断问题，仅保留既有 Configuration Hints。

## 4. Browser Verification

使用真实 Chromium 对当前无预热版本完成针对性复核：

```text
URL: /labs/markdown-stream-rendering?mode=benchmark
场景: XSS 安全
速度: 60 FPS
轮次: 2
实例: 1
```

结果：

- 页面加载 4.7 万字符源文档，并确定性复制 10 份形成 47.3 万字符基线。
- 进度从 `0 / — executions` 收敛为 `4 / 4 executions`，不存在额外预热 Execution。
- 逐轮顺序为 `Legacy → Incremental → Incremental → Legacy`。
- Legacy 与 Incremental 各产生 2 个正式样本。
- 最终规范化可见内容摘要一致。
- 完整报告、逐轮指标和 JSON 导出入口正常显示。
- 浏览器控制台 0 Error、0 Warning。

## 5. Production Benchmark Closeout

使用独立临时 Worktree 和 3190 端口完成 Production Build 参考基准，不影响 3100 Dev Server：

```text
场景: 综合重型
基线: 472,763 字符
速度: 60 FPS
切分: 字符 12～32
轮次: 10
预热: 无
正式执行: 20
```

结果：

- 20 / 20 次执行完成，Legacy 与 Incremental 各 10 个样本。
- 逐轮顺序严格按照奇偶轮交替。
- 主线程累计耗时降低 96.41%，端到端平均完成时间降低 58.51%。
- Commit P50 降低 31.16%，P95 降低 25.58%。
- 最终规范化可见文本摘要一致，Incremental Runtime Fallback 为 0。
- 原始 JSON 通过 Schema、执行数量和一致性校验。
- Production 浏览器控制台 0 Error、0 Warning。

完整结论和原始数据见 [`benchmark-report.md`](./benchmark-report.md)。

## 6. User Experience Confirmation

用户在了解预热用途后明确要求移除预热，并确认提交无预热版本。完成 10 轮 Production
重型基准、原始数据归档和正式报告后，用户再次要求提交本次收尾改动，视为最终体验验证通过。

## 7. Conclusion

本次能力满足 Spec 和 Use Case，可进入本地提交。报告数值只描述当前设备、浏览器、输入与运行时负载，不作为跨设备固定性能
承诺。
