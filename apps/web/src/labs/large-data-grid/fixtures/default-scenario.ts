import type { GridScenario } from '@/labs/large-data-grid/types/grid';
export const DEFAULT_GRID_SCENARIO = {
  columnCount: 100,
  defaultColumnWidthCssPx: 144,
  id: 'million-by-hundred',
  rowCount: 1000000,
  rowHeightCssPx: 28,
  seed: 20260730,
} as const satisfies GridScenario;
export const GRID_SCENARIOS: readonly GridScenario[] = [
  DEFAULT_GRID_SCENARIO,
  {
    ...DEFAULT_GRID_SCENARIO,
    id: 'developer-100k',
    rowCount: 100000,
  },
  {
    ...DEFAULT_GRID_SCENARIO,
    id: 'developer-10k',
    rowCount: 10000,
  },
];
export const DEFAULT_ROW_OVERSCAN = 4;
export const DEFAULT_COLUMN_OVERSCAN = 2;
export const DEFAULT_BENCHMARK_ROUNDS = 3;
export const DEFAULT_BENCHMARK_VIEWPORT = {
  heightCssPx: 560,
  widthCssPx: 960,
} as const;
