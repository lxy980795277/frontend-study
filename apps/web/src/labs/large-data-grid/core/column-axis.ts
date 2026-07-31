import type { GridColumn } from '@/labs/large-data-grid/types/grid';
export class GridColumnAxis {
  readonly columns: readonly GridColumn[];
  private readonly prefix: Float64Array;
  private readonly widths: Float64Array;
  constructor(columns: readonly GridColumn[], widthOverrides: Readonly<Record<string, number>> = {}) {
    this.columns = columns;
    this.widths = new Float64Array(columns.length);
    this.prefix = new Float64Array(columns.length + 1);
    columns.forEach((column, index) => {
      const requested = widthOverrides[column.id] ?? column.widthCssPx;
      this.widths[index] = clamp(requested, column.minWidthCssPx, column.maxWidthCssPx);
      this.prefix[index + 1] = this.prefix[index]! + this.widths[index];
    });
  }
  totalWidthCssPx = (): number => {
    return this.prefix[this.prefix.length - 1]!;
  };
  getOffsetCssPx = (columnIndex: number): number => {
    return this.prefix[clampIndex(columnIndex, 0, this.columns.length)]!;
  };
  getWidthCssPx = (columnIndex: number): number => {
    if (this.columns.length === 0) {
      return 0;
    }
    return this.widths[clampIndex(columnIndex, 0, this.columns.length - 1)]!;
  };
  findColumnAt = (offsetCssPx: number): number => {
    if (this.columns.length === 0) {
      return -1;
    }
    const target = clamp(offsetCssPx, 0, Math.max(0, this.totalWidthCssPx() - Number.EPSILON));
    let low = 0;
    let high = this.columns.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (this.prefix[middle + 1]! <= target) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    return Math.min(low, this.columns.length - 1);
  };
}
const clamp = (value: number, minimum: number, maximum: number): number => {
  return Math.min(maximum, Math.max(minimum, value));
};
const clampIndex = (value: number, minimum: number, maximum: number): number => {
  if (!Number.isInteger(value)) {
    throw new RangeError('column index must be an integer');
  }
  return Math.min(maximum, Math.max(minimum, value));
};
