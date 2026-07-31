import type { GridRendererKind } from '@/labs/large-data-grid/types/grid';
import type { GridBenchmarkConfiguration, GridBenchmarkExecution } from '../types/benchmark';
const RENDERERS: readonly GridRendererKind[] = ['dom', 'main-canvas', 'worker-offscreen'];
export const createGridBenchmarkPlan = (
  configuration: GridBenchmarkConfiguration,
): readonly GridBenchmarkExecution[] => {
  const executions: GridBenchmarkExecution[] = [];
  let order = 0;
  for (let round = 1; round <= configuration.roundCount; round += 1) {
    const offset = (round - 1) % RENDERERS.length;
    for (let position = 0; position < RENDERERS.length; position += 1) {
      const renderer = RENDERERS[(position + offset) % RENDERERS.length];
      if (!renderer) {
        continue;
      }
      order += 1;
      executions.push({
        id: `round-${String(round)}-${renderer}`,
        order,
        renderer,
        round,
      });
    }
  }
  return executions;
};
export const createGridScrollTrace = (rowCount: number, traceLength: number): readonly number[] => {
  if (rowCount <= 0 || traceLength <= 0) {
    return [];
  }
  const lastRow = rowCount - 1;
  const anchors = [0, Math.floor(lastRow * 0.25), Math.floor(lastRow * 0.5), Math.floor(lastRow * 0.9), lastRow];
  const trace: number[] = [];
  let state = 20260730;
  for (let index = 0; index < traceLength; index += 1) {
    const anchor = anchors[index % anchors.length] ?? 0;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const direction = index % 2 === 0 ? 1 : -1;
    const localOffset = direction * (state % 4096);
    trace.push(Math.min(lastRow, Math.max(0, anchor + localOffset)));
  }
  trace[0] = 0;
  trace[trace.length - 1] = lastRow;
  return trace;
};
