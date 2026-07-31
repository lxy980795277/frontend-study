import type { LatencySummary } from '../types/benchmark';

export const summarizeGridLatency = (samples: readonly number[]): LatencySummary => {
  if (samples.length === 0) {
    return {
      average: 0,
      maximum: 0,
      p50: 0,
      p95: 0,
    };
  }
  const sorted = [...samples].sort((left, right) => {
    return left - right;
  });
  const total = sorted.reduce((sum, value) => {
    return sum + value;
  }, 0);
  return {
    average: total / sorted.length,
    maximum: sorted[sorted.length - 1] ?? 0,
    p50: nearestRank(sorted, 0.5),
    p95: nearestRank(sorted, 0.95),
  };
};
const nearestRank = (sorted: readonly number[], percentile: number): number => {
  const index = Math.max(0, Math.ceil(sorted.length * percentile) - 1);
  return sorted[index] ?? 0;
};
