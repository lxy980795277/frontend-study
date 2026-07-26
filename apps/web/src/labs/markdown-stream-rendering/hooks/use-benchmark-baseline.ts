'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  BENCHMARK_COPY_COUNT,
  createBenchmarkBaseline,
  inspectBenchmarkMarkdown,
  type BenchmarkInspection,
} from '../fixtures/benchmark';
import { BenchmarkLoadError, loadBenchmarkMarkdown } from '../services/benchmark';

export type BenchmarkLoadStatus = 'error' | 'loading' | 'ready';

export interface BenchmarkBaselineState {
  baseline: string;
  copyCount: number;
  error: BenchmarkLoadError | null;
  inspection: BenchmarkInspection | null;
  retry: () => void;
  status: BenchmarkLoadStatus;
}

export function useBenchmarkBaseline(): BenchmarkBaselineState {
  const [attempt, setAttempt] = useState(0);
  const [baseline, setBaseline] = useState('');
  const [error, setError] = useState<BenchmarkLoadError | null>(null);
  const [inspection, setInspection] = useState<BenchmarkInspection | null>(null);
  const [status, setStatus] = useState<BenchmarkLoadStatus>('loading');

  const retry = useCallback(() => {
    setStatus('loading');
    setError(null);
    setAttempt((current) => {
      return current + 1;
    });
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    void loadBenchmarkMarkdown(abortController.signal)
      .then((source) => {
        const nextInspection = inspectBenchmarkMarkdown(source);
        const nextBaseline = createBenchmarkBaseline(source);

        if (abortController.signal.aborted) {
          return;
        }

        setBaseline(nextBaseline);
        setInspection(nextInspection);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (abortController.signal.aborted) {
          return;
        }

        const nextError =
          cause instanceof BenchmarkLoadError
            ? cause
            : new BenchmarkLoadError('超大 Markdown 基准校验失败，请检查 Fixture。', 0, false);
        setBaseline('');
        setInspection(null);
        setError(nextError);
        setStatus('error');
      });

    return () => {
      abortController.abort();
    };
  }, [attempt]);

  return {
    baseline,
    copyCount: BENCHMARK_COPY_COUNT,
    error,
    inspection,
    retry,
    status,
  };
}
