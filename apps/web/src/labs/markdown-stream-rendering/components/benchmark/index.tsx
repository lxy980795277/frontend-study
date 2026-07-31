'use client';

import type { FC } from 'react';
import { useEffect } from 'react';

import { BenchmarkConfiguration } from '@/labs/markdown-stream-rendering/components/benchmark/config';
import { BenchmarkReport } from '@/labs/markdown-stream-rendering/components/benchmark/report';
import { BaselineStatus } from '@/labs/markdown-stream-rendering/components/benchmark/status';
import { BenchmarkWorkspace } from '@/labs/markdown-stream-rendering/components/benchmark/workspace';
import { MARKDOWN_FIXTURES } from '@/labs/markdown-stream-rendering/fixtures/fixtures';
import { useIsolatedBenchmark } from '@/labs/markdown-stream-rendering/hooks/use-isolated-benchmark';

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

      <BaselineStatus
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
