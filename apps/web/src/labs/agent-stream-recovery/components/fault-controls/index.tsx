'use client';

import type { AgentSimulationOptions } from '@frontend-study/shared-types';
import type { ChangeEvent, FC } from 'react';

import { Input } from '@/components/ui/input';

interface FaultControlsProps {
  busy: boolean;
  simulation: AgentSimulationOptions;
  onSimulationChange: (simulation: AgentSimulationOptions) => void;
}

export const FaultControls: FC<FaultControlsProps> = ({ busy, simulation, onSimulationChange }) => {
  const updateFailureChunk = (event: ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.valueAsNumber;
    onSimulationChange({
      ...simulation,
      ...(Number.isNaN(value) ? { failAfterChunks: undefined } : { failAfterChunks: value }),
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium" htmlFor="fail-after-chunks">
          指定 Chunk 后失败
        </label>
        <Input
          className="mt-2"
          disabled={busy}
          id="fail-after-chunks"
          max={500}
          min={1}
          placeholder="留空表示不注入失败"
          type="number"
          value={simulation.failAfterChunks ?? ''}
          onChange={updateFailureChunk}
        />
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        仅用于验证 Producer 失败后的 RUN_ERROR 收敛；留空表示不注入故障。
      </p>
    </div>
  );
};
