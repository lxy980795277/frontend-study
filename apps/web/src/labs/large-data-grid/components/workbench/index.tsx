'use client';

import type { FC } from 'react';
import { useGridWorkbench } from '@/labs/large-data-grid/hooks/use-grid-workbench';
import { GridControls } from '@/labs/large-data-grid/components/workbench/controls';
import { GridLiveMetricsPanel } from '@/labs/large-data-grid/components/workbench/metrics';
import { GridStatusBar } from '@/labs/large-data-grid/components/workbench/status';
import { GridViewport } from '@/labs/large-data-grid/components/grid';
export const LargeDataGridWorkbench: FC = () => {
  const { actions, model, viewportCallbacks } = useGridWorkbench();
  return (
    <section
      className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-2 overflow-hidden"
      data-testid="large-data-grid-workbench"
    >
      <GridControls
        columnCount={model.columnCount}
        columnOverscan={model.columnOverscan}
        columns={model.dataSource.columns}
        renderer={model.renderer}
        rowCount={model.rowCount}
        rowOverscan={model.rowOverscan}
        onApplyQuery={actions.applyQuery}
        onColumnCountChange={actions.setColumnCount}
        onColumnOverscanChange={actions.setColumnOverscan}
        onCopy={actions.copySelection}
        onInjectFailure={actions.injectWorkerFailure}
        onJump={actions.jumpToRow}
        onRendererChange={actions.setRenderer}
        onReset={actions.reset}
        onRowCountChange={actions.setRowCount}
        onRowOverscanChange={actions.setRowOverscan}
        onSelectAll={actions.selectAll}
      />

      <GridStatusBar
        activeCell={model.activeCell}
        feedback={model.feedback}
        logicalCellCount={model.rowCount * model.columnCount}
        projectionSummary={model.projectionSummary}
        queryProgress={model.queryProgress}
        runtimeStatus={model.runtimeStatus}
      />

      <GridViewport
        activeCell={model.activeCell}
        columnAxis={model.columnAxis}
        columnOverscan={model.columnOverscan}
        copyRequestId={model.copyRequestId}
        dataSource={model.dataSource}
        faultRequestId={model.faultRequestId}
        jumpRequest={model.jumpRequest}
        projection={model.projection}
        query={model.query}
        queryVersion={model.queryVersion}
        renderer={model.renderer}
        rowOverscan={model.rowOverscan}
        runtimeGeneration={model.runtimeGeneration}
        scenario={model.scenario}
        selectAllRequestId={model.selectAllRequestId}
        selection={model.selection}
        widthOverrides={model.widthOverrides}
        onActiveCellChange={actions.setActiveCell}
        onColumnResize={actions.setColumnWidth}
        onFeedback={actions.setFeedback}
        onFrameDrawn={viewportCallbacks.onFrameDrawn}
        onQueryProgress={viewportCallbacks.onQueryProgress}
        onQueryResult={viewportCallbacks.onQueryResult}
        onRuntimeError={viewportCallbacks.onRuntimeError}
        onRuntimeFallback={viewportCallbacks.onRuntimeFallback}
        onRuntimeReady={viewportCallbacks.onRuntimeReady}
        onSelectionChange={actions.setSelection}
      />

      <GridLiveMetricsPanel metrics={model.liveMetrics} />
    </section>
  );
};
