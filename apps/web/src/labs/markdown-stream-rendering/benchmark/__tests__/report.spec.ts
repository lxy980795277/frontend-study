import { createBenchmarkConsistency, createVisibleContentHash } from '../report';
import { summarizeLatency } from '../statistics';
import type { BenchmarkExecutionResult } from '../../types/benchmark';
describe('benchmark report', () => {
  it('normalizes insignificant whitespace before hashing visible content', () => {
    expect(createVisibleContentHash('hello  \n world')).toBe(createVisibleContentHash('hello world'));
  });
  it('passes consistency only when every renderer has one matching hash and final length', () => {
    const results = [createResult('legacy', 'same'), createResult('incremental', 'same')];
    expect(createBenchmarkConsistency(results)).toEqual({
      incrementalHashes: ['same'],
      legacyHashes: ['same'],
      passed: true,
    });
    expect(createBenchmarkConsistency([createResult('legacy', 'a'), createResult('incremental', 'b')]).passed).toBe(
      false,
    );
  });
});
const createResult = (renderer: 'incremental' | 'legacy', contentHash: string): BenchmarkExecutionResult => {
  return {
    committedFrames: 1,
    contentHash,
    contentMatchesExpectedLength: true,
    execution: {
      id: renderer,
      order: 0,
      renderer,
      round: 1,
    },
    finalContentLength: 10,
    frameLatency: summarizeLatency([5]),
    frameLatencySamples: [5],
    inputFrames: 1,
    longTasks: {
      count: 0,
      maxMs: 0,
      supported: true,
      totalMs: 0,
    },
    metrics: {
      elapsedMs: 5,
      incremental: {
        applyMs: 1,
        coalescedFrames: 0,
        commits: 1,
        fallbackPatchRate: 0,
        mainAverageMs: 1,
        mainMaxMs: 1,
        mainTotalMs: 1,
        mountMs: 0,
        runtimeFallbacks: 0,
        tailAppendRate: 1,
        workerDiffMs: 1,
        workerParseMs: 1,
        workerRequests: 1,
      },
      inputFrames: 1,
      legacy: {
        commits: 1,
        mainAverageMs: 1,
        mainMaxMs: 1,
        mainTotalMs: 1,
      },
    },
    wallMs: 5,
  };
};
