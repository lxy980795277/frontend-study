import type { FC } from 'react';

import type { GridColumnAxis } from '@/labs/large-data-grid/core/column-axis';
import type { GridDataSource } from '@/labs/large-data-grid/types/data';
import type {
  GridFrameMetrics,
  GridQuery,
  GridQueryProgress,
  GridQueryResult,
  GridRendererKind,
  GridScenario,
} from '@/labs/large-data-grid/types/grid';
import type { GridFrameSnapshot } from '@/labs/large-data-grid/types/renderer';

import { CanvasGridRenderer } from './canvas';
import { DomVirtualGrid } from './dom';

interface GridRendererLayerProps {
  columnAxis: GridColumnAxis;
  dataSource: GridDataSource;
  faultRequestId: number;
  query: GridQuery;
  renderer: GridRendererKind;
  scenario: GridScenario;
  snapshot: GridFrameSnapshot;
  widthOverrides: Readonly<Record<string, number>>;
  onFallback: (reason: string) => void;
  onFrameDrawn: (metrics: GridFrameMetrics) => void;
  onQueryProgress: (progress: GridQueryProgress, queryVersion: number) => void;
  onQueryResult: (result: GridQueryResult) => void;
  onRuntimeError: (reason: string) => void;
  onRuntimeReady: (effectiveRenderer: GridRendererKind) => void;
}

export const GridRendererLayer: FC<GridRendererLayerProps> = ({
  columnAxis,
  dataSource,
  faultRequestId,
  onFallback,
  onFrameDrawn,
  onQueryProgress,
  onQueryResult,
  onRuntimeError,
  onRuntimeReady,
  query,
  renderer,
  scenario,
  snapshot,
  widthOverrides,
}) => {
  if (renderer === 'dom') {
    return (
      <DomVirtualGrid columnAxis={columnAxis} dataSource={dataSource} snapshot={snapshot} onFrameDrawn={onFrameDrawn} />
    );
  }

  return (
    <CanvasGridRenderer
      columnAxis={columnAxis}
      dataSource={dataSource}
      faultRequestId={faultRequestId}
      query={query}
      renderer={renderer}
      scenario={scenario}
      snapshot={snapshot}
      widthOverrides={widthOverrides}
      onFallback={onFallback}
      onFrameDrawn={onFrameDrawn}
      onQueryProgress={onQueryProgress}
      onQueryResult={onQueryResult}
      onRuntimeError={onRuntimeError}
      onRuntimeReady={onRuntimeReady}
    />
  );
};
