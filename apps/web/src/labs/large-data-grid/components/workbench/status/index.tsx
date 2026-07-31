import type { FC } from 'react';

import { Badge } from '@/components/ui/badge';
import type {
  GridCellRef,
  GridProjectionSummary,
  GridQueryProgress,
  GridRuntimeStatus,
} from '@/labs/large-data-grid/types/grid';
interface GridStatusBarProps {
  activeCell: GridCellRef | null;
  feedback: string;
  logicalCellCount: number;
  projectionSummary: GridProjectionSummary;
  queryProgress: GridQueryProgress | null;
  runtimeStatus: GridRuntimeStatus;
}
const PHASE_LABELS: Record<GridRuntimeStatus['phase'], string> = {
  error: 'Error',
  fallback: 'Fallback',
  loading: 'Loading',
  ready: 'Ready',
};
export const GridStatusBar: FC<GridStatusBarProps> = ({
  activeCell,
  feedback,
  logicalCellCount,
  projectionSummary,
  queryProgress,
  runtimeStatus,
}) => {
  const activeLabel = activeCell ? `${activeCell.rowId} / ${activeCell.columnId}` : '未选择';
  const range = runtimeStatus.frameMetrics?.range;
  let visibleLabel = '等待首帧';
  if (range && range.rowEnd >= range.rowStart && range.columnEnd >= range.columnStart) {
    visibleLabel = `R${String(range.rowStart + 1)}–${String(range.rowEnd + 1)} / C${String(range.columnStart + 1)}–${String(range.columnEnd + 1)}`;
  }
  return (
    <div
      className="grid gap-1.5 rounded-lg border bg-muted/30 px-2.5 py-1.5 text-xs sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center"
      data-testid="large-data-grid-status"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{PHASE_LABELS[runtimeStatus.phase]}</Badge>
        <span className="font-medium">{runtimeStatus.renderer}</span>
        <span className="text-muted-foreground">{logicalCellCount.toLocaleString('zh-CN')} 逻辑单元格</span>
        <span className="text-muted-foreground">{projectionSummary.rowCount.toLocaleString('zh-CN')} 显示行</span>
        <span className="font-mono text-[11px] text-muted-foreground">{visibleLabel}</span>
        <span className="font-mono text-[11px] text-muted-foreground">{activeLabel}</span>
      </div>
      <div className="min-w-0 text-muted-foreground sm:text-right">
        <QueryProgressLabel progress={queryProgress} />
        <span>{feedback}</span>
      </div>
    </div>
  );
};
interface QueryProgressLabelProps {
  progress: GridQueryProgress | null;
}
const QueryProgressLabel: FC<QueryProgressLabelProps> = ({ progress }) => {
  if (!progress) {
    return null;
  }
  const percentage = progress.totalRows === 0 ? 100 : Math.round((progress.completedRows / progress.totalRows) * 100);
  return (
    <span className="mr-2 font-medium text-foreground">
      {progress.phase} {String(percentage)}%
    </span>
  );
};
