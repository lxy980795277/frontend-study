'use client';

import { Play, Square } from 'lucide-react';
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GridBenchmarkConfiguration, GridBenchmarkPhase } from '@/labs/large-data-grid/types/benchmark';
interface GridBenchmarkConfigurationProps {
  configuration: GridBenchmarkConfiguration;
  onRoundCountChange: (roundCount: number) => void;
  onStart: () => void;
  onStop: () => void;
  phase: GridBenchmarkPhase;
}
export const GridBenchmarkConfigurationPanel: FC<GridBenchmarkConfigurationProps> = ({
  configuration,
  onRoundCountChange,
  onStart,
  onStop,
  phase,
}) => {
  const running = phase === 'measuring' || phase === 'preparing' || phase === 'settling';
  return (
    <section className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div>
        <p className="text-[11px] font-medium text-muted-foreground">固定负载</p>
        <p className="mt-1 font-mono text-sm font-semibold">
          {configuration.rowCount.toLocaleString('zh-CN')} × {String(configuration.columnCount)}
        </p>
      </div>
      <div>
        <p className="text-[11px] font-medium text-muted-foreground">固定视口</p>
        <p className="mt-1 font-mono text-sm font-semibold">
          {String(configuration.viewportWidthCssPx)} × {String(configuration.viewportHeightCssPx)}
        </p>
      </div>
      <div>
        <p className="text-[11px] font-medium text-muted-foreground">滚动轨迹</p>
        <p className="mt-1 font-mono text-sm font-semibold">{String(configuration.traceLength)} commits</p>
      </div>
      <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">
        正式轮次
        <Select
          disabled={running}
          value={String(configuration.roundCount)}
          onValueChange={(value) => {
            onRoundCountChange(Number.parseInt(value, 10));
          }}
        >
          <SelectTrigger aria-label="Benchmark 正式轮次" className="min-w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 轮</SelectItem>
            <SelectItem value="2">2 轮</SelectItem>
            <SelectItem value="3">3 轮（默认）</SelectItem>
            <SelectItem value="5">5 轮</SelectItem>
          </SelectContent>
        </Select>
      </label>

      <div className="ml-auto flex gap-2">
        <Button disabled={running} size="sm" onClick={onStart}>
          <Play aria-hidden className="size-3.5" />
          开始隔离基准
        </Button>
        <Button disabled={!running} size="sm" variant="outline" onClick={onStop}>
          <Square aria-hidden className="size-3.5" />
          停止
        </Button>
      </div>
    </section>
  );
};
