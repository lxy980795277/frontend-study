import { DEFAULT_GRID_SCENARIO } from '../../fixtures/default-scenario';
import { DeterministicGridDataSource, sourceIndexAt, viewRowCount } from '../data-source';
describe('DeterministicGridDataSource', () => {
  it('represents the million by one hundred default without materializing rows', () => {
    const dataSource = new DeterministicGridDataSource(DEFAULT_GRID_SCENARIO);
    expect(dataSource.rowCount).toBe(1000000);
    expect(dataSource.columns).toHaveLength(100);
    expect(dataSource.getRowId(999999)).toBe('row-1000000');
    expect(dataSource.getCellText(42, 6)).toBe(dataSource.getCellText(42, 6));
  });
  it('produces different deterministic values for different coordinates', () => {
    const first = new DeterministicGridDataSource(DEFAULT_GRID_SCENARIO);
    const second = new DeterministicGridDataSource(DEFAULT_GRID_SCENARIO);
    expect(first.getCellText(99, 7)).toBe(second.getCellText(99, 7));
    expect(first.getCellText(99, 7)).not.toBe(first.getCellText(100, 7));
  });
  it('maps identity and indexed projections without row objects', () => {
    const dataSource = new DeterministicGridDataSource({
      ...DEFAULT_GRID_SCENARIO,
      rowCount: 3,
    });
    const projection = new Uint32Array([2, 0]);
    expect(sourceIndexAt(null, 1)).toBe(1);
    expect(sourceIndexAt(projection, 0)).toBe(2);
    expect(viewRowCount(dataSource, null)).toBe(3);
    expect(viewRowCount(dataSource, projection)).toBe(2);
  });
});
