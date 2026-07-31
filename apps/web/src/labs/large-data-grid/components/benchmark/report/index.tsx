'use client';

import { Download } from 'lucide-react';
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { downloadGridBenchmarkReport } from '@/labs/large-data-grid/benchmark/report';
import type { GridBenchmarkReport } from '@/labs/large-data-grid/types/benchmark';
interface GridBenchmarkReportProps {
  report: GridBenchmarkReport;
}
export const GridBenchmarkReportPanel: FC<GridBenchmarkReportProps> = ({ report }) => {
  const memoryLabel = report.environment.memory.supported ? 'available' : 'unavailable';
  return (
    <section className="min-w-0 rounded-xl border bg-card p-4 shadow-sm" data-testid="grid-benchmark-report">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Benchmark 报告</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {report.status} · {String(report.executions.length)} 次已完成执行 · 内存 {memoryLabel}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            downloadGridBenchmarkReport(report);
          }}
        >
          <Download aria-hidden className="size-3.5" />
          导出 JSON
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[72rem] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b bg-muted/50 text-muted-foreground">
              <th className="px-3 py-2 font-medium">顺序</th>
              <th className="px-3 py-2 font-medium">Renderer</th>
              <th className="px-3 py-2 font-medium">状态</th>
              <th className="px-3 py-2 font-medium">Init</th>
              <th className="px-3 py-2 font-medium">First Frame</th>
              <th className="px-3 py-2 font-medium">Commit Avg</th>
              <th className="px-3 py-2 font-medium">P50</th>
              <th className="px-3 py-2 font-medium">P95</th>
              <th className="px-3 py-2 font-medium">Max</th>
              <th className="px-3 py-2 font-medium">Draw Avg</th>
              <th className="px-3 py-2 font-medium">Long Tasks</th>
              <th className="px-3 py-2 font-medium">摘要</th>
            </tr>
          </thead>
          <tbody>
            {report.executions.map((result) => {
              return (
                <tr key={result.execution.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono">{String(result.execution.order)}</td>
                  <td className="px-3 py-2 font-medium">
                    {result.execution.renderer}
                    <EffectiveRenderer result={result} />
                  </td>
                  <td className="px-3 py-2">{result.status}</td>
                  <td className="px-3 py-2 font-mono">{result.initializationMs.toFixed(2)} ms</td>
                  <td className="px-3 py-2 font-mono">{result.firstFrameMs.toFixed(2)} ms</td>
                  <td className="px-3 py-2 font-mono">{result.averageScrollCommitMs.toFixed(2)} ms</td>
                  <td className="px-3 py-2 font-mono">{result.p50ScrollCommitMs.toFixed(2)} ms</td>
                  <td className="px-3 py-2 font-mono">{result.p95ScrollCommitMs.toFixed(2)} ms</td>
                  <td className="px-3 py-2 font-mono">{result.maximumScrollCommitMs.toFixed(2)} ms</td>
                  <td className="px-3 py-2 font-mono">{result.averageDrawMs.toFixed(2)} ms</td>
                  <td className="px-3 py-2 font-mono">
                    {result.longTasks.supported ? String(result.longTasks.count) : 'unavailable'}
                  </td>
                  <td className="px-3 py-2 font-mono">{result.visibleTextDigest}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
interface EffectiveRendererProps {
  result: GridBenchmarkReport['executions'][number];
}
const EffectiveRenderer: FC<EffectiveRendererProps> = ({ result }) => {
  if (result.effectiveRenderer === result.execution.renderer) {
    return null;
  }
  return <span className="ml-1 text-[10px] text-muted-foreground">→ {result.effectiveRenderer}</span>;
};
