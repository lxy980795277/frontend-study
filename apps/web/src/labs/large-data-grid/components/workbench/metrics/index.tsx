import type { FC } from 'react';

import type { GridLiveMetrics } from '@/labs/large-data-grid/types/metrics';
interface GridLiveMetricsProps {
  metrics: GridLiveMetrics;
}
export const GridLiveMetricsPanel: FC<GridLiveMetricsProps> = ({ metrics }) => {
  return (
    <section
      aria-label="实时渲染指标"
      className="flex min-w-0 items-center gap-4 overflow-x-auto rounded-lg border bg-card px-3 py-1"
    >
      <Metric label="Commit" value={metrics.commitCount.toLocaleString('zh-CN')} />
      <Metric label="本帧单元格" value={metrics.lastDrawnCellCount.toLocaleString('zh-CN')} />
      <Metric label="平均 Draw" value={`${metrics.averageDrawMs.toFixed(2)} ms`} />
      <Metric label="最大 Draw" value={`${metrics.maxDrawMs.toFixed(2)} ms`} />
      <Metric label="Fallback" value={String(metrics.fallbackCount)} />
      <Metric label="可见摘要" value={metrics.visibleTextDigest ?? '等待首帧'} />
    </section>
  );
};
interface MetricProps {
  label: string;
  value: string;
}
const Metric: FC<MetricProps> = ({ label, value }) => {
  return (
    <div className="flex shrink-0 items-baseline gap-1.5">
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="max-w-44 truncate font-mono text-[11px] font-semibold" title={value}>
        {value}
      </span>
    </div>
  );
};
