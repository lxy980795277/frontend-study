'use client';

import type { FC } from 'react';

import { GridViewport } from '@/labs/large-data-grid/components/grid';
import type { GridColumnAxis } from '@/labs/large-data-grid/core/column-axis';
import type { DeterministicGridDataSource } from '@/labs/large-data-grid/core/data-source';
import { DEFAULT_COLUMN_OVERSCAN, DEFAULT_ROW_OVERSCAN } from '@/labs/large-data-grid/fixtures/default-scenario';
import type { GridBenchmarkExecution } from '@/labs/large-data-grid/types/benchmark';
import type {
  GridCellRef,
  GridFrameMetrics,
  GridJumpRequest,
  GridQuery,
  GridQueryProgress,
  GridQueryResult,
  GridRendererKind,
  GridScenario,
  GridSelection,
} from '@/labs/large-data-grid/types/grid';

interface BenchmarkRendererHostProps {
  activeExecution: GridBenchmarkExecution | null;
  columnAxis: GridColumnAxis;
  dataSource: DeterministicGridDataSource;
  jumpRequest: GridJumpRequest | null;
  scenario: GridScenario;
  onFrameDrawn: (metrics: GridFrameMetrics) => void;
  onRuntimeError: (reason: string) => void;
  onRuntimeFallback: (reason: string) => void;
  onRuntimeReady: (renderer: GridRendererKind) => void;
}

const IDENTITY_QUERY: GridQuery = {
  filter: null,
  sort: null,
};

const EMPTY_WIDTH_OVERRIDES: Readonly<Record<string, number>> = {};

const ignoreQueryProgress = (_progress: GridQueryProgress, _queryVersion: number): void => {
  return undefined;
};

const ignoreQueryResult = (_result: GridQueryResult): void => {
  return undefined;
};

const ignoreMessage = (_message: string): void => {
  return undefined;
};

const ignoreColumnResize = (_columnId: string, _widthCssPx: number): void => {
  return undefined;
};

const ignoreActiveCell = (_cell: GridCellRef): void => {
  return undefined;
};

const ignoreSelection = (_selection: GridSelection | null): void => {
  return undefined;
};

export const BenchmarkRendererHost: FC<BenchmarkRendererHostProps> = ({
  activeExecution,
  columnAxis,
  dataSource,
  jumpRequest,
  onFrameDrawn,
  onRuntimeError,
  onRuntimeFallback,
  onRuntimeReady,
  scenario,
}) => {
  if (!activeExecution) {
    return (
      <div className="flex h-[35rem] items-center justify-center rounded-lg border border-dashed bg-background text-sm text-muted-foreground">
        启动后这里只挂载当前 Renderer。
      </div>
    );
  }

  return (
    <div className="h-[35rem]">
      <GridViewport
        key={activeExecution.id}
        activeCell={null}
        columnAxis={columnAxis}
        columnOverscan={DEFAULT_COLUMN_OVERSCAN}
        copyRequestId={0}
        dataSource={dataSource}
        faultRequestId={0}
        jumpRequest={jumpRequest}
        projection={null}
        query={IDENTITY_QUERY}
        queryVersion={0}
        renderer={activeExecution.renderer}
        rowOverscan={DEFAULT_ROW_OVERSCAN}
        runtimeGeneration={0}
        scenario={scenario}
        selectAllRequestId={0}
        selection={null}
        widthOverrides={EMPTY_WIDTH_OVERRIDES}
        onActiveCellChange={ignoreActiveCell}
        onColumnResize={ignoreColumnResize}
        onFeedback={ignoreMessage}
        onFrameDrawn={onFrameDrawn}
        onQueryProgress={ignoreQueryProgress}
        onQueryResult={ignoreQueryResult}
        onRuntimeError={onRuntimeError}
        onRuntimeFallback={onRuntimeFallback}
        onRuntimeReady={onRuntimeReady}
        onSelectionChange={ignoreSelection}
      />
    </div>
  );
};
