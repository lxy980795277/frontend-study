'use client';

import { Download } from 'lucide-react';
import type { FC } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { RunMetricsSnapshot } from '../../metrics/types';

interface MetricsPanelProps {
  metrics: RunMetricsSnapshot;
}

export const MetricsPanel: FC<MetricsPanelProps> = ({ metrics }) => {
  const gain = calculateGain(metrics.legacy.mainTotalMs, metrics.incremental.mainTotalMs);
  const comparisonRows = [
    {
      incremental: formatDuration(metrics.incremental.mainAverageMs),
      label: '平均主线程耗时',
      legacy: formatDuration(metrics.legacy.mainAverageMs),
    },
    {
      incremental: formatDuration(metrics.incremental.mainMaxMs),
      label: '峰值主线程耗时',
      legacy: formatDuration(metrics.legacy.mainMaxMs),
    },
    {
      incremental: formatDuration(metrics.incremental.mainTotalMs),
      label: '累计主线程耗时',
      legacy: formatDuration(metrics.legacy.mainTotalMs),
    },
    {
      incremental: String(metrics.incremental.commits),
      label: 'DOM Commit',
      legacy: String(metrics.legacy.commits),
    },
  ];
  const exportMetrics = (): void => {
    const blob = new Blob([JSON.stringify(metrics, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.download = `markdown-stream-metrics-${Date.now()}.json`;
    anchor.href = url;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 text-xs" data-testid="metrics-panel">
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
        <div>
          <p className="text-[0.625rem] tracking-wide text-muted-foreground uppercase">Main-thread gain</p>
          <p className="mt-1 font-mono text-xl font-semibold">{formatPercentage(gain)}</p>
        </div>
        <Badge variant="secondary">{metrics.inputFrames} frames</Badge>
      </div>

      <Button className="w-full" size="sm" variant="outline" onClick={exportMetrics}>
        <Download aria-hidden className="size-3.5" />
        导出本轮指标
      </Button>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full table-fixed">
          <thead className="bg-muted/40 text-[0.625rem] text-muted-foreground">
            <tr>
              <th className="w-[44%] px-3 py-2 text-left font-medium">同口径指标</th>
              <th className="px-2 py-2 text-right font-medium">Legacy</th>
              <th className="px-3 py-2 text-right font-medium">Incremental</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => {
              return (
                <tr key={row.label} className="border-t">
                  <th className="px-3 py-2 text-left font-normal text-muted-foreground">{row.label}</th>
                  <td className="px-2 py-2 text-right font-mono">{row.legacy}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.incremental}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <MetricCard label="Worker parse" value={formatDuration(metrics.incremental.workerParseMs)} />
        <MetricCard label="Worker diff" value={formatDuration(metrics.incremental.workerDiffMs)} />
        <MetricCard label="Patch apply" value={formatDuration(metrics.incremental.applyMs)} />
        <MetricCard label="React mount" value={formatDuration(metrics.incremental.mountMs)} />
        <MetricCard label="Tail patch" value={formatPercentage(metrics.incremental.tailAppendRate)} />
        <MetricCard label="Snapshot fallback" value={formatPercentage(metrics.incremental.fallbackPatchRate)} />
        <MetricCard label="Worker request" value={String(metrics.incremental.workerRequests)} />
        <MetricCard label="Coalesced frame" value={String(metrics.incremental.coalescedFrames)} />
      </dl>

      {metrics.incremental.runtimeFallbacks > 0 && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">
          已发生 {metrics.incremental.runtimeFallbacks} 次运行时降级，内容仍由安全全量渲染保证。
        </p>
      )}
    </div>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
}

const MetricCard: FC<MetricCardProps> = ({ label, value }) => {
  return (
    <div className="min-w-0 rounded-lg border p-2.5">
      <dt className="truncate text-[0.625rem] text-muted-foreground" title={label}>
        {label}
      </dt>
      <dd className="mt-1 truncate font-mono font-medium" title={value}>
        {value}
      </dd>
    </div>
  );
};

function calculateGain(legacyMs: number, incrementalMs: number): number {
  if (legacyMs <= 0) {
    return 0;
  }

  return (legacyMs - incrementalMs) / legacyMs;
}

function formatDuration(value: number): string {
  if (value < 0.01) {
    return '0.00 ms';
  }

  return `${value.toFixed(2)} ms`;
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
