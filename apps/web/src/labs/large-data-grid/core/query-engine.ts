import type { GridComparableValue, GridDataSource, RunGridQueryOptions } from '../types/data';
import type { GridProjectionSummary, GridQueryResult } from '@/labs/large-data-grid/types/grid';
const QUERY_CHUNK_SIZE = 16384;
const SORT_YIELD_INTERVAL = 65536;
export const runGridQuery = async (options: RunGridQueryOptions): Promise<GridQueryResult> => {
  if (options.query.filter === null && options.query.sort === null) {
    return {
      projection: null,
      queryVersion: options.queryVersion,
      summary: createProjectionSummary(options.dataSource, null),
    };
  }
  let projection = await createFilteredProjection(options);
  assertNotCancelled(options.isCancelled);
  if (options.query.sort) {
    projection ??= createIdentityProjection(options.dataSource.rowCount);
    projection = await stableSortProjection(projection, options);
  }
  assertNotCancelled(options.isCancelled);
  return {
    projection,
    queryVersion: options.queryVersion,
    summary: createProjectionSummary(options.dataSource, projection),
  };
};
export const createProjectionSummary = (
  dataSource: GridDataSource,
  projection: Uint32Array | null,
): GridProjectionSummary => {
  const rowCount = projection?.length ?? dataSource.rowCount;
  if (rowCount === 0) {
    return {
      digest: 'empty',
      firstRowId: null,
      lastRowId: null,
      rowCount: 0,
    };
  }
  const firstSourceRow = projection?.[0] ?? 0;
  const lastSourceRow = projection?.[rowCount - 1] ?? rowCount - 1;
  const middleSourceRow = projection?.[Math.floor(rowCount / 2)] ?? Math.floor(rowCount / 2);
  const firstRowId = dataSource.getRowId(firstSourceRow);
  const lastRowId = dataSource.getRowId(lastSourceRow);
  const digest = hashText(`${firstRowId}|${dataSource.getRowId(middleSourceRow)}|${lastRowId}|${String(rowCount)}`);
  return {
    digest,
    firstRowId,
    lastRowId,
    rowCount,
  };
};
export class GridQueryCancelledError extends Error {
  constructor() {
    super('Grid query was replaced by a newer request');
    this.name = 'GridQueryCancelledError';
  }
}
const createFilteredProjection = async (options: RunGridQueryOptions): Promise<Uint32Array | null> => {
  const filter = options.query.filter;
  if (filter === null || filter.text.trim().length === 0) {
    return null;
  }
  const columnIndexes = filter.columnIds
    .map((columnId) => {
      return options.dataSource.columns.findIndex((column) => {
        return column.id === columnId && column.filterable;
      });
    })
    .filter((columnIndex) => {
      return columnIndex >= 0;
    });
  const needle = filter.text.trim().toLocaleLowerCase();
  const matches = new Uint32Array(options.dataSource.rowCount);
  let matchCount = 0;

  // 分块扫描并主动让出事件循环，百万行过滤不会长期独占 Worker。
  for (let sourceRow = 0; sourceRow < options.dataSource.rowCount; sourceRow += 1) {
    const isMatch = columnIndexes.some((columnIndex) => {
      return options.dataSource.getCellText(sourceRow, columnIndex).toLocaleLowerCase().includes(needle);
    });
    if (isMatch) {
      matches[matchCount] = sourceRow;
      matchCount += 1;
    }
    if ((sourceRow + 1) % QUERY_CHUNK_SIZE === 0) {
      options.onProgress({
        completedRows: sourceRow + 1,
        phase: 'filtering',
        totalRows: options.dataSource.rowCount,
      });
      await yieldToEventLoop();
      assertNotCancelled(options.isCancelled);
    }
  }
  return matches.slice(0, matchCount);
};
const stableSortProjection = async (initial: Uint32Array, options: RunGridQueryOptions): Promise<Uint32Array> => {
  const sort = options.query.sort;
  if (sort === null || initial.length < 2) {
    return initial;
  }
  const columnIndex = options.dataSource.columns.findIndex((column) => {
    return column.id === sort.columnId && column.sortable;
  });
  if (columnIndex < 0) {
    return initial;
  }
  let source: Uint32Array<ArrayBufferLike> = initial;
  let target: Uint32Array<ArrayBufferLike> = new Uint32Array(initial.length);
  let processedSinceYield = 0;
  for (let width = 1; width < initial.length; width *= 2) {
    for (let left = 0; left < initial.length; left += width * 2) {
      const middle = Math.min(left + width, initial.length);
      const right = Math.min(left + width * 2, initial.length);
      mergeRange(source, target, left, middle, right, columnIndex, sort.direction, options.dataSource);
      processedSinceYield += right - left;
      if (processedSinceYield >= SORT_YIELD_INTERVAL) {
        processedSinceYield = 0;
        options.onProgress({
          completedRows: Math.min(initial.length, left + (right - left)),
          phase: 'sorting',
          totalRows: initial.length,
        });
        await yieldToEventLoop();
        assertNotCancelled(options.isCancelled);
      }
    }
    const previousSource = source;
    source = target;
    target = previousSource;
  }
  return source;
};
const mergeRange = (
  source: Uint32Array,
  target: Uint32Array,
  left: number,
  middle: number,
  right: number,
  columnIndex: number,
  direction: 'ascending' | 'descending',
  dataSource: GridDataSource,
): void => {
  let leftCursor = left;
  let rightCursor = middle;
  let writeCursor = left;
  while (leftCursor < middle && rightCursor < right) {
    const leftRow = source[leftCursor]!;
    const rightRow = source[rightCursor]!;
    const comparison = compareRows(leftRow, rightRow, columnIndex, direction, dataSource);
    if (comparison <= 0) {
      target[writeCursor] = leftRow;
      leftCursor += 1;
    } else {
      target[writeCursor] = rightRow;
      rightCursor += 1;
    }
    writeCursor += 1;
  }
  while (leftCursor < middle) {
    target[writeCursor] = source[leftCursor]!;
    leftCursor += 1;
    writeCursor += 1;
  }
  while (rightCursor < right) {
    target[writeCursor] = source[rightCursor]!;
    rightCursor += 1;
    writeCursor += 1;
  }
};
const compareRows = (
  leftRow: number,
  rightRow: number,
  columnIndex: number,
  direction: 'ascending' | 'descending',
  dataSource: GridDataSource,
): number => {
  const left = dataSource.getComparableValue(leftRow, columnIndex);
  const right = dataSource.getComparableValue(rightRow, columnIndex);
  const comparison = compareValues(left, right);
  const directed = direction === 'ascending' ? comparison : -comparison;
  return directed === 0 ? leftRow - rightRow : directed;
};
const compareValues = (left: GridComparableValue, right: GridComparableValue): number => {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  return String(left).localeCompare(String(right), 'en');
};
const createIdentityProjection = (rowCount: number): Uint32Array => {
  const projection = new Uint32Array(rowCount);
  for (let index = 0; index < rowCount; index += 1) {
    projection[index] = index;
  }
  return projection;
};
const assertNotCancelled = (isCancelled: () => boolean): void => {
  if (isCancelled()) {
    throw new GridQueryCancelledError();
  }
};
const yieldToEventLoop = (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};
const hashText = (value: string): string => {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0)!;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};
