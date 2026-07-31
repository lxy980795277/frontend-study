import type { LargeDataGridLabMode } from '../types/controller';

export const parseLargeDataGridLabMode = (value: string | null): LargeDataGridLabMode => {
  return value === 'benchmark' ? 'benchmark' : 'workbench';
};
