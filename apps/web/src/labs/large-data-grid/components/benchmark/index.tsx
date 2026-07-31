'use client';

import type { FC } from 'react';
import { useEffect, useMemo } from 'react';

import { GridBenchmarkConfigurationPanel } from '@/labs/large-data-grid/components/benchmark/config';
import { BenchmarkRendererHost } from '@/labs/large-data-grid/components/benchmark/host';
import { GridBenchmarkReportPanel } from '@/labs/large-data-grid/components/benchmark/report';
import { GridColumnAxis } from '@/labs/large-data-grid/core/column-axis';
import { DeterministicGridDataSource } from '@/labs/large-data-grid/core/data-source';
import { DEFAULT_GRID_SCENARIO } from '@/labs/large-data-grid/fixtures/default-scenario';
import { useIsolatedBenchmark } from '@/labs/large-data-grid/hooks/use-isolated-benchmark';
import type { GridScenario } from '@/labs/large-data-grid/types/grid';

interface IsolatedBenchmarkProps {
  onRunningChange: (running: boolean) => void;
}

export const IsolatedLargeDataGridBenchmark: FC<IsolatedBenchmarkProps> = ({ onRunningChange }) => {
  const { actions, model } = useIsolatedBenchmark();
  const scenario = useMemo<GridScenario>(() => {
    return {
      ...DEFAULT_GRID_SCENARIO,
      columnCount: model.configuration.columnCount,
      rowCount: model.configuration.rowCount,
    };
  }, [model.configuration.columnCount, model.configuration.rowCount]);
  const dataSource = useMemo(() => {
    return new DeterministicGridDataSource(scenario);
  }, [scenario]);
  const columnAxis = useMemo(() => {
    return new GridColumnAxis(dataSource.columns);
  }, [dataSource.columns]);
  const running = model.phase === 'measuring' || model.phase === 'preparing' || model.phase === 'settling';
  useEffect(() => {
    onRunningChange(running);
  }, [onRunningChange, running]);
  return (
    <section
      className="grid min-h-0 min-w-0 flex-1 content-start gap-3 overflow-y-auto"
      data-testid="large-data-grid-benchmark"
    >
      <GridBenchmarkConfigurationPanel
        configuration={model.configuration}
        phase={model.phase}
        onRoundCountChange={actions.setRoundCount}
        onStart={actions.start}
        onStop={actions.stop}
      />

      <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <strong className="text-foreground">{model.phase}</strong>
        <span className="ml-2">
          Execution {String(Math.min(model.executionIndex + 1, model.executions.length))}/
          {String(model.executions.length)} · Trace {String(model.traceIndex)}/{String(model.configuration.traceLength)}
        </span>
        <ActiveExecutionLabel execution={model.activeExecution} />
      </div>

      <div className="min-w-0 overflow-x-auto rounded-xl bg-muted/20 p-2">
        <div className="w-[60rem] max-w-none">
          <BenchmarkRendererHost
            activeExecution={model.activeExecution}
            columnAxis={columnAxis}
            dataSource={dataSource}
            jumpRequest={model.jumpRequest}
            scenario={scenario}
            onFrameDrawn={actions.onFrameDrawn}
            onRuntimeError={actions.onRuntimeError}
            onRuntimeFallback={actions.onRuntimeFallback}
            onRuntimeReady={actions.onRuntimeReady}
          />
        </div>
      </div>

      <BenchmarkResultsPreview results={model.results} />
      <BenchmarkReport report={model.report} />
    </section>
  );
};
interface ActiveExecutionLabelProps {
  execution: ReturnType<typeof useIsolatedBenchmark>['model']['activeExecution'];
}
const ActiveExecutionLabel: FC<ActiveExecutionLabelProps> = ({ execution }) => {
  if (!execution) {
    return null;
  }
  return (
    <span className="ml-2 font-mono text-foreground">
      Round {String(execution.round)} · {execution.renderer}
    </span>
  );
};
interface BenchmarkResultsPreviewProps {
  results: ReturnType<typeof useIsolatedBenchmark>['model']['results'];
}
const BenchmarkResultsPreview: FC<BenchmarkResultsPreviewProps> = ({ results }) => {
  if (results.length === 0) {
    return null;
  }
  return (
    <div className="text-xs text-muted-foreground">
      已完成 {String(results.length)} 次：最近一次 {results.at(-1)?.execution.renderer} · P95{' '}
      {results.at(-1)?.p95ScrollCommitMs.toFixed(2)} ms
    </div>
  );
};
interface BenchmarkReportProps {
  report: ReturnType<typeof useIsolatedBenchmark>['model']['report'];
}
const BenchmarkReport: FC<BenchmarkReportProps> = ({ report }) => {
  if (!report) {
    return null;
  }
  return <GridBenchmarkReportPanel report={report} />;
};
