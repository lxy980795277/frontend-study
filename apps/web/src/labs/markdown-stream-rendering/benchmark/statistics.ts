import type {
  BenchmarkExecutionResult,
  BenchmarkLatencySummary,
  BenchmarkLongTaskSummary,
  BenchmarkRenderer,
  BenchmarkRendererSummary,
} from './types';

const EMPTY_LATENCY: BenchmarkLatencySummary = {
  averageMs: 0,
  maxMs: 0,
  p50Ms: 0,
  p95Ms: 0,
  sampleCount: 0,
};

const EMPTY_LONG_TASKS: BenchmarkLongTaskSummary = {
  count: 0,
  maxMs: 0,
  supported: false,
  totalMs: 0,
};

export function summarizeLatency(values: readonly number[]): BenchmarkLatencySummary {
  if (values.length === 0) {
    return EMPTY_LATENCY;
  }

  const sorted = [...values].sort((left, right) => {
    return left - right;
  });
  const total = sorted.reduce((sum, value) => {
    return sum + value;
  }, 0);

  return {
    averageMs: total / sorted.length,
    maxMs: sorted.at(-1) ?? 0,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    sampleCount: sorted.length,
  };
}

export function summarizeRenderer(
  results: readonly BenchmarkExecutionResult[],
  renderer: BenchmarkRenderer,
): BenchmarkRendererSummary {
  const rendererResults = results.filter((result) => {
    return result.execution.renderer === renderer;
  });
  const allLatencies = rendererResults.flatMap((result) => {
    return result.frameLatencySamples;
  });
  const wallTimes = rendererResults.map((result) => {
    return result.wallMs;
  });
  const longTasks = rendererResults.map((result) => {
    return result.longTasks;
  });
  const mainTotalMs = rendererResults.reduce((total, result) => {
    return total + getMainTotal(result, renderer);
  }, 0);
  const mainCommits = rendererResults.reduce((total, result) => {
    return total + getMainCommits(result, renderer);
  }, 0);

  return {
    coalescedFrames: rendererResults.reduce((total, result) => {
      return total + result.metrics.incremental.coalescedFrames;
    }, 0),
    committedFrames: rendererResults.reduce((total, result) => {
      return total + result.committedFrames;
    }, 0),
    executions: rendererResults.length,
    frameLatency: summarizeLatency(allLatencies),
    inputFrames: rendererResults.reduce((total, result) => {
      return total + result.inputFrames;
    }, 0),
    longTasks: summarizeLongTasks(longTasks),
    mainAverageMs: mainCommits === 0 ? 0 : mainTotalMs / mainCommits,
    mainMaxMs: rendererResults.reduce((maximum, result) => {
      return Math.max(maximum, getMainMax(result, renderer));
    }, 0),
    mainTotalMs,
    wallAverageMs: average(wallTimes),
    wallMaxMs: wallTimes.length === 0 ? 0 : Math.max(...wallTimes),
    wallMinMs: wallTimes.length === 0 ? 0 : Math.min(...wallTimes),
    workerRequests: rendererResults.reduce((total, result) => {
      return total + result.metrics.incremental.workerRequests;
    }, 0),
  };
}

export function summarizeLongTasks(summaries: readonly BenchmarkLongTaskSummary[]): BenchmarkLongTaskSummary {
  if (summaries.length === 0) {
    return EMPTY_LONG_TASKS;
  }

  return {
    count: summaries.reduce((total, summary) => {
      return total + summary.count;
    }, 0),
    maxMs: summaries.reduce((maximum, summary) => {
      return Math.max(maximum, summary.maxMs);
    }, 0),
    supported: summaries.every((summary) => {
      return summary.supported;
    }),
    totalMs: summaries.reduce((total, summary) => {
      return total + summary.totalMs;
    }, 0),
  };
}

function percentile(sortedValues: readonly number[], quantile: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  const rank = Math.ceil(quantile * sortedValues.length) - 1;
  const index = Math.min(sortedValues.length - 1, Math.max(0, rank));

  return sortedValues[index] ?? 0;
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce((total, value) => {
      return total + value;
    }, 0) / values.length
  );
}

function getMainTotal(result: BenchmarkExecutionResult, renderer: BenchmarkRenderer): number {
  return renderer === 'legacy' ? result.metrics.legacy.mainTotalMs : result.metrics.incremental.mainTotalMs;
}

function getMainMax(result: BenchmarkExecutionResult, renderer: BenchmarkRenderer): number {
  return renderer === 'legacy' ? result.metrics.legacy.mainMaxMs : result.metrics.incremental.mainMaxMs;
}

function getMainCommits(result: BenchmarkExecutionResult, renderer: BenchmarkRenderer): number {
  return renderer === 'legacy' ? result.metrics.legacy.commits : result.metrics.incremental.commits;
}
