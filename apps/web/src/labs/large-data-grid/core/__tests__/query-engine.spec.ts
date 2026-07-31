import { DEFAULT_GRID_SCENARIO } from '../../fixtures/default-scenario';
import { DeterministicGridDataSource } from '../data-source';
import { GridQueryCancelledError, runGridQuery } from '../query-engine';
describe('runGridQuery', () => {
  const dataSource = new DeterministicGridDataSource({
    ...DEFAULT_GRID_SCENARIO,
    columnCount: 8,
    rowCount: 256,
  });
  it('keeps identity projection allocation-free without a query', async () => {
    const result = await runGridQuery({
      dataSource,
      isCancelled: () => {
        return false;
      },
      onProgress: () => {
        return undefined;
      },
      query: {
        filter: null,
        sort: null,
      },
      queryVersion: 1,
    });
    expect(result.projection).toBeNull();
    expect(result.summary.rowCount).toBe(256);
  });
  it('filters and stably sorts source row indexes', async () => {
    const result = await runGridQuery({
      dataSource,
      isCancelled: () => {
        return false;
      },
      onProgress: () => {
        return undefined;
      },
      query: {
        filter: {
          columnIds: ['column-2'],
          text: 'ready',
        },
        sort: {
          columnId: 'column-4',
          direction: 'descending',
        },
      },
      queryVersion: 2,
    });
    expect(result.projection).not.toBeNull();
    expect(result.summary.rowCount).toBeGreaterThan(0);
    expect(result.summary.rowCount).toBeLessThan(256);
    expect(result.summary.digest).toMatch(/^[0-9a-f]{8}$/u);
  });
  it('does not commit a query already replaced by a newer version', async () => {
    await expect(
      runGridQuery({
        dataSource,
        isCancelled: () => {
          return true;
        },
        onProgress: () => {
          return undefined;
        },
        query: {
          filter: null,
          sort: {
            columnId: 'column-1',
            direction: 'ascending',
          },
        },
        queryVersion: 3,
      }),
    ).rejects.toBeInstanceOf(GridQueryCancelledError);
  });
});
