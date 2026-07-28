'use client';

import { CircleCheck, LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react';
import type { FC } from 'react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

import { MARKDOWN_FIXTURES } from '../../fixtures/fixtures';
import { useIsolatedBenchmark } from '../../hooks/use-isolated-benchmark';
import { BenchmarkConfiguration } from '../benchmark-configuration';
import { BenchmarkReport } from '../benchmark-report';
import { BenchmarkWorkspace } from '../benchmark-workspace';

interface IsolatedBenchmarkProps {
  onRunningChange: (isRunning: boolean) => void;
}

export const IsolatedBenchmark: FC<IsolatedBenchmarkProps> = ({ onRunningChange }) => {
  const benchmark = useIsolatedBenchmark();
  const { actions, state } = benchmark;

  useEffect(() => {
    onRunningChange(state.isRunning);
  }, [onRunningChange, state.isRunning]);

  useEffect(() => {
    return () => {
      onRunningChange(false);
    };
  }, [onRunningChange]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <BenchmarkConfiguration
        baselineStatus={state.baseline.status}
        configuration={state.configuration}
        fixtures={MARKDOWN_FIXTURES}
        isRunning={state.isRunning}
        onFixtureChange={actions.setFixture}
        onFpsChange={actions.setFps}
        onRoundCountChange={actions.setRoundCount}
        onSplitModeChange={actions.setSplitMode}
        onStart={actions.start}
        onStop={actions.stop}
      />

      <IsolatedBaselineStatus
        codeBlockCount={state.baseline.codeBlockCount}
        copyCount={state.baseline.copyCount}
        errorMessage={state.baseline.errorMessage}
        sourceCharacters={state.baseline.sourceCharacters}
        status={state.baseline.status}
        totalCharacters={state.baseline.totalCharacters}
        onRetry={actions.retryBaseline}
      />

      {state.errorMessage.length > 0 && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {state.errorMessage}
        </p>
      )}

      <BenchmarkWorkspace
        actions={actions}
        activeExecution={state.activeExecution}
        completedExecutions={state.completedExecutions}
        content={state.content}
        lastRenderer={state.results.at(-1)?.execution.renderer ?? null}
        metrics={state.metrics}
        phase={state.phase}
        totalExecutions={state.totalExecutions}
      />

      {state.report && <BenchmarkReport report={state.report} />}
    </div>
  );
};

interface IsolatedBaselineStatusProps {
  codeBlockCount: number;
  copyCount: number;
  errorMessage: string;
  onRetry: () => void;
  sourceCharacters: number;
  status: 'error' | 'loading' | 'ready';
  totalCharacters: number;
}

const IsolatedBaselineStatus: FC<IsolatedBaselineStatusProps> = ({
  codeBlockCount,
  copyCount,
  errorMessage,
  onRetry,
  sourceCharacters,
  status,
  totalCharacters,
}) => {
  const statusLabel = {
    error: '基准加载失败',
    loading: '正在加载超大 Markdown 基准',
    ready: '隔离基准数据已就绪',
  }[status];

  return (
    <section
      aria-live="polite"
      data-testid="isolated-baseline-status"
      className={cn(
        'flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-xs',
        status === 'error' && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <div className="flex items-center gap-2">
        {status === 'loading' && <LoaderCircle aria-hidden className="size-4 animate-spin text-primary" />}
        {status === 'ready' && <CircleCheck aria-hidden className="size-4 text-success" />}
        {status === 'error' && <TriangleAlert aria-hidden className="size-4 text-destructive" />}
        <div>
          <p className="font-medium">{statusLabel}</p>
          {status === 'error' && <p className="mt-0.5 text-muted-foreground">{errorMessage}</p>}
        </div>
      </div>

      {status === 'ready' && (
        <p className="font-mono text-[0.6875rem] text-muted-foreground">
          source {formatCharacters(sourceCharacters)} · {copyCount}× · total {formatCharacters(totalCharacters)} ·{' '}
          {codeBlockCount} code blocks / copy
        </p>
      )}

      {status === 'error' && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RotateCcw aria-hidden className="size-3.5" />
          重试
        </Button>
      )}
    </section>
  );
};

function formatCharacters(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(value);
}
