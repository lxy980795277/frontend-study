'use client';

import { CircleCheck, Download, TriangleAlert } from 'lucide-react';
import type { FC } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils/cn';

import type {
  BenchmarkExecutionResult,
  BenchmarkRenderer,
  BenchmarkRendererSummary,
  IsolatedBenchmarkReport,
} from '../../benchmark/types';

interface BenchmarkReportProps {
  report: IsolatedBenchmarkReport;
}

export const BenchmarkReport: FC<BenchmarkReportProps> = ({ report }) => {
  const exportReport = (): void => {
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.download = `markdown-isolated-benchmark-${Date.now()}.json`;
    anchor.href = url;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const reportPresentation = {
    completed: {
      badgeVariant: 'secondary' as const,
      label: '完整报告',
    },
    stopped: {
      badgeVariant: 'outline' as const,
      label: '未完成报告',
    },
  }[report.status];
  const consistencyPresentation = report.consistency.passed
    ? {
        containerClassName: 'border-success/30 bg-success/5',
        Icon: CircleCheck,
        iconClassName: 'text-success',
        label: '最终可见内容一致',
      }
    : {
        containerClassName: 'border-warning/30 bg-warning/5',
        Icon: TriangleAlert,
        iconClassName: 'text-warning',
        label: '最终可见内容尚未通过一致性校验',
      };
  const ConsistencyIcon = consistencyPresentation.Icon;

  return (
    <section aria-label="隔离基准报告" className="space-y-4" data-testid="isolated-benchmark-report">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">隔离基准报告</h2>
            <Badge variant={reportPresentation.badgeVariant}>{reportPresentation.label}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {report.configuration.roundCount} 轮 · {report.configuration.fps} FPS · 单 Renderer 串行挂载
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={exportReport}>
          <Download aria-hidden className="size-3.5" />
          导出 JSON
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <RendererSummaryCard renderer="legacy" summary={report.summary.legacy} />
        <RendererSummaryCard renderer="incremental" summary={report.summary.incremental} />
      </div>

      <div
        className={cn(
          'flex items-start gap-2 rounded-lg border p-3 text-xs',
          consistencyPresentation.containerClassName,
        )}
      >
        <ConsistencyIcon aria-hidden className={cn('mt-0.5 size-4 shrink-0', consistencyPresentation.iconClassName)} />
        <div>
          <p className="font-medium">{consistencyPresentation.label}</p>
          <p className="mt-1 font-mono text-[0.625rem] text-muted-foreground">
            Legacy {report.consistency.legacyHashes.join(', ') || '—'} · Incremental{' '}
            {report.consistency.incrementalHashes.join(', ') || '—'}
          </p>
        </div>
      </div>

      <ExecutionTable executions={report.executions} />
    </section>
  );
};

interface RendererSummaryCardProps {
  renderer: BenchmarkRenderer;
  summary: BenchmarkRendererSummary;
}

const RendererSummaryCard: FC<RendererSummaryCardProps> = ({ renderer, summary }) => {
  const title = {
    incremental: 'Incremental',
    legacy: 'Legacy',
  }[renderer];
  const longTaskCount = summary.longTasks.supported ? String(summary.longTasks.count) : 'N/A';

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="outline">{summary.executions} runs</Badge>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-4">
        <SummaryMetric label="Main total" value={formatDuration(summary.mainTotalMs)} />
        <SummaryMetric label="Commit P50" value={formatDuration(summary.frameLatency.p50Ms)} />
        <SummaryMetric label="Commit P95" value={formatDuration(summary.frameLatency.p95Ms)} />
        <SummaryMetric label="Wall avg" value={formatDuration(summary.wallAverageMs)} />
        <SummaryMetric label="Long tasks" value={longTaskCount} />
        <SummaryMetric label="DOM commits" value={String(summary.committedFrames)} />
        <SummaryMetric label="Worker request" value={String(summary.workerRequests)} />
        <SummaryMetric label="Coalesced" value={String(summary.coalescedFrames)} />
      </dl>
    </Card>
  );
};

interface SummaryMetricProps {
  label: string;
  value: string;
}

const SummaryMetric: FC<SummaryMetricProps> = ({ label, value }) => {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[0.625rem] text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate font-mono font-medium" title={value}>
        {value}
      </dd>
    </div>
  );
};

interface ExecutionTableProps {
  executions: BenchmarkExecutionResult[];
}

const ExecutionTable: FC<ExecutionTableProps> = ({ executions }) => {
  if (executions.length === 0) {
    return (
      <Card className="p-6 text-center text-xs text-muted-foreground">
        尚无完成的正式轮次，当前报告只记录了任务状态和环境。
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[58rem] text-xs">
        <thead className="bg-muted/40 text-[0.625rem] text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">顺序</th>
            <th className="px-3 py-2 text-left font-medium">轮次</th>
            <th className="px-3 py-2 text-left font-medium">Renderer</th>
            <th className="px-3 py-2 text-right font-medium">Main total</th>
            <th className="px-3 py-2 text-right font-medium">P50</th>
            <th className="px-3 py-2 text-right font-medium">P95</th>
            <th className="px-3 py-2 text-right font-medium">Max</th>
            <th className="px-3 py-2 text-right font-medium">Wall</th>
            <th className="px-3 py-2 text-right font-medium">Long tasks</th>
            <th className="px-3 py-2 text-right font-medium">Commits</th>
          </tr>
        </thead>
        <tbody>
          {executions.map((result) => {
            const mainTotal =
              result.execution.renderer === 'legacy'
                ? result.metrics.legacy.mainTotalMs
                : result.metrics.incremental.mainTotalMs;
            const rendererLabel = {
              incremental: 'Incremental',
              legacy: 'Legacy',
            }[result.execution.renderer];
            const longTaskCount = result.longTasks.supported ? result.longTasks.count : 'N/A';

            return (
              <tr key={result.execution.id} className="border-t">
                <td className="px-3 py-2 font-mono">{result.execution.order + 1}</td>
                <td className="px-3 py-2 font-mono">{result.execution.round}</td>
                <td className="px-3 py-2 font-medium">{rendererLabel}</td>
                <td className="px-3 py-2 text-right font-mono">{formatDuration(mainTotal)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatDuration(result.frameLatency.p50Ms)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatDuration(result.frameLatency.p95Ms)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatDuration(result.frameLatency.maxMs)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatDuration(result.wallMs)}</td>
                <td className="px-3 py-2 text-right font-mono">{longTaskCount}</td>
                <td className="px-3 py-2 text-right font-mono">{result.committedFrames}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

function formatDuration(value: number): string {
  return `${value.toFixed(2)} ms`;
}
