'use client';

import { Bug, Pause, Play, RotateCcw } from 'lucide-react';
import type { FC, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/utils/cn';
import type { BenchmarkPhase } from '@/labs/markdown-stream-rendering/types/controller';
import type { MarkdownFixture, StreamConfiguration } from '@/labs/markdown-stream-rendering/types/fixture';
interface ControlBarProps {
  configuration: StreamConfiguration;
  fixtureId: string;
  fixtures: readonly MarkdownFixture[];
  instanceCount: 1 | 4;
  isPlaying: boolean;
  phase: BenchmarkPhase;
  onFailure: () => void;
  onFpsChange: (fps: number) => void;
  onInstanceCountChange: (count: 1 | 4) => void;
  onReset: () => void;
  onSelectFixture: (fixtureId: string) => void;
  onSplitModeChange: (mode: StreamConfiguration['mode']) => void;
  onTogglePlayback: () => void;
}
export const ControlBar: FC<ControlBarProps> = ({
  configuration,
  fixtureId,
  fixtures,
  instanceCount,
  isPlaying,
  phase,
  onFailure,
  onFpsChange,
  onInstanceCountChange,
  onReset,
  onSelectFixture,
  onSplitModeChange,
  onTogglePlayback,
}) => {
  let playbackLabel = '开始';
  let PlaybackIcon = Play;
  if (isPlaying) {
    playbackLabel = '暂停';
    PlaybackIcon = Pause;
  } else if (phase === 'paused') {
    playbackLabel = '继续';
  } else if (phase === 'completed') {
    playbackLabel = '重新运行';
    PlaybackIcon = RotateCcw;
  }
  const benchmarkUnavailable = phase === 'error' || phase === 'loading' || phase === 'preparing';
  const failureUnavailable = phase !== 'running' && phase !== 'paused';
  return (
    <section
      aria-label="流式渲染控制台"
      className="flex shrink-0 flex-wrap items-end gap-x-5 gap-y-3 rounded-xl border bg-card p-3 shadow-sm"
    >
      <div className="flex flex-wrap gap-2">
        <Button disabled={benchmarkUnavailable} size="sm" onClick={onTogglePlayback}>
          <PlaybackIcon aria-hidden className="size-3.5" />
          {playbackLabel}
        </Button>
        <Button disabled={benchmarkUnavailable} size="sm" variant="outline" onClick={onReset}>
          <RotateCcw aria-hidden className="size-3.5" />
          重置
        </Button>
        <Button disabled={failureUnavailable} size="sm" variant="outline" onClick={onFailure}>
          <Bug aria-hidden className="size-3.5" />
          注入 Worker 故障
        </Button>
      </div>

      <ControlGroup label="场景">
        <Select disabled={benchmarkUnavailable} value={fixtureId} onValueChange={onSelectFixture}>
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
      </ControlGroup>

      <ControlGroup label={`推送速度 ${configuration.fps} FPS`}>
        <Slider
          aria-label="流式推送速度"
          className="h-8 w-28"
          disabled={benchmarkUnavailable}
          max={60}
          min={5}
          step={5}
          value={[configuration.fps]}
          onValueChange={(value) => {
            onFpsChange(value[0] ?? configuration.fps);
          }}
        />
      </ControlGroup>

      <ControlGroup label="切分方式">
        <SegmentedControl
          activeValue={configuration.mode}
          disabled={benchmarkUnavailable}
          options={[
            { label: '字符', value: 'char' },
            { label: 'Token', value: 'token' },
          ]}
          onChange={(value) => {
            onSplitModeChange(value as StreamConfiguration['mode']);
          }}
        />
      </ControlGroup>

      <ControlGroup label="渲染实例">
        <SegmentedControl
          activeValue={String(instanceCount)}
          disabled={benchmarkUnavailable}
          options={[
            { label: '1×', value: '1' },
            { label: '4×', value: '4' },
          ]}
          onChange={(value) => {
            onInstanceCountChange(value === '4' ? 4 : 1);
          }}
        />
      </ControlGroup>
    </section>
  );
};
interface ControlGroupProps {
  children: ReactNode;
  label: string;
}
const ControlGroup: FC<ControlGroupProps> = ({ children, label }) => {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      {children}
    </div>
  );
};
interface SegmentedControlProps {
  activeValue: string;
  disabled: boolean;
  options: {
    label: string;
    value: string;
  }[];
  onChange: (value: string) => void;
}
const SegmentedControl: FC<SegmentedControlProps> = ({ activeValue, disabled, options, onChange }) => {
  return (
    <div className="inline-flex h-8 rounded-md bg-muted p-0.5">
      {options.map((option) => {
        const active = option.value === activeValue;
        return (
          <button
            key={option.value}
            aria-pressed={active}
            disabled={disabled}
            type="button"
            className={cn(
              'rounded-sm px-3 text-xs font-medium text-muted-foreground transition-colors',
              active && 'bg-background text-foreground shadow-sm',
              disabled && 'cursor-not-allowed opacity-50',
            )}
            onClick={() => {
              onChange(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
