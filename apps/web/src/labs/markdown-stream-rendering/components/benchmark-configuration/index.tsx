'use client';

import { Play, Square } from 'lucide-react';
import type { FC, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

import type { IsolatedBenchmarkConfiguration } from '../../benchmark/types';
import type { MarkdownFixture } from '../../fixtures/fixtures';
import type { BenchmarkLoadStatus } from '../../hooks/use-benchmark-baseline';

interface BenchmarkConfigurationProps {
  baselineStatus: BenchmarkLoadStatus;
  configuration: IsolatedBenchmarkConfiguration;
  fixtures: readonly MarkdownFixture[];
  isRunning: boolean;
  onFixtureChange: (fixtureId: string) => void;
  onFpsChange: (fps: number) => void;
  onRoundCountChange: (roundCount: number) => void;
  onSplitModeChange: (mode: IsolatedBenchmarkConfiguration['mode']) => void;
  onStart: () => void;
  onStop: () => void;
}

export const BenchmarkConfiguration: FC<BenchmarkConfigurationProps> = ({
  baselineStatus,
  configuration,
  fixtures,
  isRunning,
  onFixtureChange,
  onFpsChange,
  onRoundCountChange,
  onSplitModeChange,
  onStart,
  onStop,
}) => {
  return (
    <section
      aria-label="隔离基准配置"
      className="flex shrink-0 flex-wrap items-end gap-x-5 gap-y-3 rounded-xl border bg-card p-3 shadow-sm"
      data-testid="isolated-benchmark-configuration"
    >
      <div className="flex gap-2">
        {!isRunning && (
          <Button disabled={baselineStatus !== 'ready'} size="sm" onClick={onStart}>
            <Play aria-hidden className="size-3.5" />
            开始隔离基准
          </Button>
        )}
        {isRunning && (
          <Button
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
            size="sm"
            variant="outline"
            onClick={onStop}
          >
            <Square aria-hidden className="size-3.5" />
            停止
          </Button>
        )}
      </div>

      <ConfigurationGroup label="场景">
        <Select
          disabled={isRunning || baselineStatus !== 'ready'}
          value={configuration.fixtureId}
          onValueChange={onFixtureChange}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fixtures.map((fixture) => {
              return (
                <SelectItem key={fixture.id} value={fixture.id}>
                  {fixture.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </ConfigurationGroup>

      <ConfigurationGroup label={`推送速度 ${configuration.fps} FPS`}>
        <Slider
          aria-label="隔离基准推送速度"
          className="h-8 w-32"
          disabled={isRunning || baselineStatus !== 'ready'}
          max={60}
          min={5}
          step={5}
          value={[configuration.fps]}
          onValueChange={(value) => {
            onFpsChange(value[0] ?? configuration.fps);
          }}
        />
      </ConfigurationGroup>

      <ConfigurationGroup label="切分方式">
        <Select
          disabled={isRunning || baselineStatus !== 'ready'}
          value={configuration.mode}
          onValueChange={(value) => {
            onSplitModeChange(value as IsolatedBenchmarkConfiguration['mode']);
          }}
        >
          <SelectTrigger className="min-w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="char">字符</SelectItem>
            <SelectItem value="token">Token</SelectItem>
          </SelectContent>
        </Select>
      </ConfigurationGroup>

      <ConfigurationGroup label="正式轮次">
        <Select
          disabled={isRunning || baselineStatus !== 'ready'}
          value={String(configuration.roundCount)}
          onValueChange={(value) => {
            onRoundCountChange(Number(value));
          }}
        >
          <SelectTrigger className="min-w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 轮</SelectItem>
            <SelectItem value="2">2 轮</SelectItem>
            <SelectItem value="3">3 轮</SelectItem>
            <SelectItem value="5">5 轮</SelectItem>
            <SelectItem value="10">10 轮</SelectItem>
          </SelectContent>
        </Select>
      </ConfigurationGroup>

      <ConfigurationGroup label="渲染实例">
        <div className="flex h-8 items-center rounded-md border bg-muted/30 px-3 font-mono text-xs">1× 固定</div>
      </ConfigurationGroup>
    </section>
  );
};

interface ConfigurationGroupProps {
  children: ReactNode;
  label: string;
}

const ConfigurationGroup: FC<ConfigurationGroupProps> = ({ children, label }) => {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      {children}
    </div>
  );
};
