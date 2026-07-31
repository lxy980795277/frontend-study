import { DEFAULT_GRID_SCENARIO } from '../../fixtures/default-scenario';
import { DeterministicGridDataSource } from '../data-source';
import {
  createGridCellRef,
  createViewRowLookup,
  findViewRowById,
  normalizeSelectionBounds,
  serializeSelectionToTsv,
} from '../selection';
describe('grid selection', () => {
  const dataSource = new DeterministicGridDataSource({
    ...DEFAULT_GRID_SCENARIO,
    columnCount: 4,
    rowCount: 10,
  });
  it('normalizes stable row and column ids against a projection', () => {
    const projection = new Uint32Array([8, 3, 5]);
    const lookup = createViewRowLookup(dataSource.rowCount, projection);
    const selection = {
      anchor: createGridCellRef(dataSource, 5, 3),
      focus: createGridCellRef(dataSource, 8, 1),
      queryVersion: 2,
    };
    expect(normalizeSelectionBounds(selection, dataSource, projection, lookup)).toEqual({
      columnEnd: 3,
      columnStart: 1,
      rowEnd: 2,
      rowStart: 0,
    });
    expect(findViewRowById('row-0000004', dataSource, projection, lookup)).toBe(1);
    expect(findViewRowById('row-0000002', dataSource, projection, lookup)).toBe(-1);
  });
  it('serializes a bounded selection as tsv', () => {
    const result = serializeSelectionToTsv(
      {
        columnEnd: 1,
        columnStart: 0,
        rowEnd: 1,
        rowStart: 0,
      },
      dataSource,
      null,
      {
        maximumBytes: 10000,
        maximumCells: 10,
      },
    );
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.text.split('\n')).toHaveLength(2);
      expect(result.text).toContain('\t');
    }
  });
  it('rejects an unbounded copy before generating cell text', () => {
    expect(
      serializeSelectionToTsv(
        {
          columnEnd: 99,
          columnStart: 0,
          rowEnd: 999999,
          rowStart: 0,
        },
        new DeterministicGridDataSource(DEFAULT_GRID_SCENARIO),
        null,
        {
          maximumBytes: 1000000,
          maximumCells: 10000,
        },
      ),
    ).toMatchObject({
      estimatedCells: 100000000,
      kind: 'too-large',
    });
  });
});
