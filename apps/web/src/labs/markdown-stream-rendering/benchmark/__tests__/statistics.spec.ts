import { summarizeLatency, summarizeRenderer } from '../statistics';
import type { BenchmarkExecutionResult } from '../types';

describe('benchmark statistics', () => {
  it('calculates nearest-rank latency percentiles', () => {
    expect(summarizeLatency([100, 10, 40, 20, 30])).toEqual({
      averageMs: 40,
      maxMs: 100,
      p50Ms: 30,
      p95Ms: 100,
      sampleCount: 5,
    });
    expect(summarizeLatency([])).toEqual({
      averageMs: 0,
      maxMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      sampleCount: 0,
    });
  });

  it('aggregates every execution for the selected renderer', () => {
    const results = [
      createResult('legacy', 1, [10, 20], 100),
      createResult('legacy', 2, [30], 200),
      createResult('incremental', 1, [2], 50),
    ];

    const summary = summarizeRenderer(results, 'legacy');

    expect(summary.executions).toBe(2);
    expect(summary.frameLatency).toMatchObject({
      averageMs: 20,
      maxMs: 30,
      p50Ms: 20,
      p95Ms: 30,
      sampleCount: 3,
    });
    expect(summary.wallAverageMs).toBe(150);
    expect(summary.mainTotalMs).toBe(12);
    expect(summary.inputFrames).toBe(6);
  });
});

function createResult(
  renderer: BenchmarkExecutionResult['execution']['renderer'],
  round: number,
  latencies: number[],
  wallMs: number,
): BenchmarkExecutionResult {
  return {
    committedFrames: latencies.length,
    contentHash: 'same',
    contentMatchesExpectedLength: true,
    execution: {
      id: `${renderer}-${String(round)}`,
      order: 0,
      renderer,
      round,
    },
    finalContentLength: 10,
    frameLatency: summarizeLatency(latencies),
    frameLatencySamples: latencies,
    inputFrames: 3,
    longTasks: {
      count: 1,
      maxMs: 60,
      supported: true,
      totalMs: 60,
    },
    metrics: {
      elapsedMs: wallMs,
      incremental: {
        applyMs: 3,
        coalescedFrames: 1,
        commits: 2,
        fallbackPatchRate: 0,
        mainAverageMs: 1.5,
        mainMaxMs: 2,
        mainTotalMs: 3,
        mountMs: 1,
        runtimeFallbacks: 0,
        tailAppendRate: 1,
        workerDiffMs: 1,
        workerParseMs: 2,
        workerRequests: 2,
      },
      inputFrames: 3,
      legacy: {
        commits: 2,
        mainAverageMs: 3,
        mainMaxMs: 4,
        mainTotalMs: 6,
      },
    },
    wallMs,
  };
}
