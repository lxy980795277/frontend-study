import { DEFAULT_GRID_SCENARIO } from '../../fixtures/default-scenario';
import { GridColumnAxis } from '../column-axis';
import { createGridColumns } from '../data-source';
import { createGridScrollState, getLogicalMaximum, jumpToLogicalScroll, updatePhysicalScroll } from '../scroll-model';
import { calculateVisibleRange, countCellsInRange } from '../viewport-range';
describe('grid geometry', () => {
  it('uses a prefix axis for variable width columns', () => {
    const columns = createGridColumns(3, 100);
    const axis = new GridColumnAxis(columns, {
      'column-2': 180,
    });
    expect(axis.totalWidthCssPx()).toBe(380);
    expect(axis.getOffsetCssPx(2)).toBe(280);
    expect(axis.findColumnAt(0)).toBe(0);
    expect(axis.findColumnAt(100)).toBe(1);
    expect(axis.findColumnAt(379)).toBe(2);
  });
  it('calculates a bounded two-dimensional visible range in css pixels', () => {
    const axis = new GridColumnAxis(createGridColumns(100, 144));
    const range = calculateVisibleRange({
      columnAxis: axis,
      columnOverscan: 2,
      rowCount: 1000000,
      rowHeightCssPx: 28,
      rowOverscan: 4,
      viewport: {
        devicePixelRatio: 2,
        heightCssPx: 560,
        logicalScrollLeftCssPx: 1440,
        logicalScrollTopCssPx: 14000000,
        widthCssPx: 960,
      },
    });
    expect(range.rowStart).toBe(499996);
    expect(range.rowEnd).toBeLessThan(500025);
    expect(range.columnStart).toBe(8);
    expect(range.columnEnd).toBeLessThan(20);
    expect(countCellsInRange(range)).toBeLessThan(400);
  });
  it('rebases segmented scrolling while preserving the logical position', () => {
    const initial = createGridScrollState(
      DEFAULT_GRID_SCENARIO.rowCount * DEFAULT_GRID_SCENARIO.rowHeightCssPx,
      560,
      4000000,
    );
    const firstJump = jumpToLogicalScroll(initial, 14000000);
    expect(firstJump.state.kind).toBe('segmented');
    expect(firstJump.state.logicalScrollCssPx).toBe(14000000);
    expect(firstJump.state.physicalScrollCssPx).toBe(firstJump.state.physicalAnchorCssPx);
    const updated = updatePhysicalScroll(firstJump.state, 3200000);
    expect(updated.didRebase).toBe(true);
    expect(updated.state.logicalScrollCssPx).toBe(14000000 + (3200000 - firstJump.state.physicalAnchorCssPx));
    expect(updated.state.physicalScrollCssPx).toBe(updated.state.physicalAnchorCssPx);
  });
  it('reaches both endpoints in segmented mode', () => {
    const initial = createGridScrollState(28000000, 560, 4000000);
    const end = jumpToLogicalScroll(initial, Number.POSITIVE_INFINITY);
    const start = jumpToLogicalScroll(end.state, Number.NEGATIVE_INFINITY);
    expect(end.state.logicalScrollCssPx).toBe(getLogicalMaximum(initial));
    expect(start.state.logicalScrollCssPx).toBe(0);
    expect(start.state.physicalScrollCssPx).toBe(0);
  });
});
