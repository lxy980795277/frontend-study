import type { LongTaskMonitor } from '../browser/long-task-monitor';
import { startLongTaskMonitor } from '../browser/long-task-monitor';
import { BENCHMARK_SEPARATOR } from '../fixtures/benchmark';
import { createStreamFrames, DeterministicStreamer, type StreamFrame } from '../fixtures/streamer';
import type { MarkdownMetricsCollector } from '../metrics/collector';
import { summarizeLatency } from './statistics';
import type {
  BenchmarkActiveExecution,
  BenchmarkExecution,
  BenchmarkExecutionResult,
  BenchmarkRendererCommit,
  IsolatedBenchmarkConfiguration,
  IsolatedBenchmarkPhase,
} from './types';

const BASELINE_COMMIT_TIMEOUT_MS = 30_000;
const EXECUTION_COMMIT_TIMEOUT_MS = 10 * 60_000;

export interface RunExecutionOptions {
  baseline: string;
  collector: MarkdownMetricsCollector;
  configuration: IsolatedBenchmarkConfiguration;
  execution: BenchmarkExecution;
  fixtureContent: string;
  onActiveExecution: (execution: BenchmarkActiveExecution | null) => void;
  onComplete: (result: BenchmarkExecutionResult) => void;
  onContent: (content: string) => void;
  onLongTaskMonitor: (monitor: LongTaskMonitor | null) => void;
  onPrepareMetrics: () => void;
  onStreamFrame: (frame: StreamFrame) => void;
  onStreamer: (streamer: DeterministicStreamer | null) => void;
  onTransition: (phase: IsolatedBenchmarkPhase) => void;
  readCommitState: () => {
    committedFrames: number;
    firstFrameAt: number | null;
    frameLatencies: number[];
  };
  token: number;
  waitForCommit: (contentLength: number, timeoutMs: number) => Promise<BenchmarkRendererCommit>;
}

export async function runBenchmarkExecution(options: RunExecutionOptions): Promise<void> {
  const prefix = `${options.baseline}${BENCHMARK_SEPARATOR}## 隔离基准流式续写\n\n`;
  const frames = createStreamFrames(options.fixtureContent, options.configuration, prefix);
  const finalContentLength = frames.at(-1)?.cumulative.length ?? prefix.length;
  const baselineCommit = options.waitForCommit(options.baseline.length, BASELINE_COMMIT_TIMEOUT_MS);

  options.onPrepareMetrics();
  options.collector.reset();
  options.onContent(options.baseline);
  options.onTransition('preparing');
  options.onActiveExecution({
    execution: options.execution,
    finalContentLength,
    rendererKey: `${String(options.token)}-${options.execution.id}`,
  });
  await baselineCommit;

  const finalCommitPromise = options.waitForCommit(finalContentLength, EXECUTION_COMMIT_TIMEOUT_MS);
  options.collector.start();
  const monitor = startLongTaskMonitor();
  options.onLongTaskMonitor(monitor);
  options.onTransition('measuring');

  const streamFinished = new Promise<void>((resolve) => {
    const streamer = new DeterministicStreamer(
      frames,
      options.configuration.fps,
      (frame) => {
        options.onStreamFrame(frame);
      },
      resolve,
    );
    options.onStreamer(streamer);
    streamer.start();
  });
  const [, finalCommit] = await Promise.all([streamFinished, finalCommitPromise]);

  options.collector.finish();
  const longTasks = monitor.finish();
  options.onLongTaskMonitor(null);
  const commitState = options.readCommitState();
  const result: BenchmarkExecutionResult = {
    committedFrames: commitState.committedFrames,
    contentHash: finalCommit.contentHash ?? '',
    contentMatchesExpectedLength: finalCommit.contentLength === finalContentLength,
    execution: options.execution,
    finalContentLength: finalCommit.contentLength,
    frameLatency: summarizeLatency(commitState.frameLatencies),
    frameLatencySamples: commitState.frameLatencies,
    inputFrames: frames.length,
    longTasks,
    metrics: options.collector.snapshot(),
    wallMs: commitState.firstFrameAt === null ? 0 : Math.max(0, finalCommit.committedAt - commitState.firstFrameAt),
  };
  options.onComplete(result);
}

export function isActiveBenchmarkPhase(phase: IsolatedBenchmarkPhase): boolean {
  return phase === 'measuring' || phase === 'preparing' || phase === 'settling';
}

export function assertActiveRun(expected: number, current: number): void {
  if (expected !== current) {
    throw new BenchmarkCancelledError();
  }
}

export class BenchmarkCancelledError extends Error {
  constructor() {
    super('Benchmark cancelled');
    this.name = 'BenchmarkCancelledError';
  }
}

export function waitForBrowserSettle(cancelRef: { current: (() => void) | null }): Promise<void> {
  return new Promise((resolve, reject) => {
    let firstFrameId = 0;
    let secondFrameId = 0;
    let idleCallbackId = 0;
    let fallbackTimerId = 0;
    const idleWindow = window as unknown as {
      cancelIdleCallback?: (handle: number) => void;
      requestIdleCallback?: (callback: () => void, options: { timeout: number }) => number;
    };

    const complete = (): void => {
      cancelRef.current = null;
      resolve();
    };
    const cancel = (): void => {
      window.cancelAnimationFrame(firstFrameId);
      window.cancelAnimationFrame(secondFrameId);
      window.clearTimeout(fallbackTimerId);
      idleWindow.cancelIdleCallback?.(idleCallbackId);
      cancelRef.current = null;
      reject(new BenchmarkCancelledError());
    };
    cancelRef.current = cancel;
    firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        if (idleWindow.requestIdleCallback) {
          idleCallbackId = idleWindow.requestIdleCallback(complete, {
            timeout: 250,
          });
          return;
        }
        fallbackTimerId = window.setTimeout(complete, 0);
      });
    });
  });
}
