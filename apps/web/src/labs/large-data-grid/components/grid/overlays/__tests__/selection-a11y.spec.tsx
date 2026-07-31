import { render, screen } from '@testing-library/react';
import { GridColumnAxis } from '@/labs/large-data-grid/core/column-axis';
import type { GridColumn, GridViewport, GridVisibleRange } from '@/labs/large-data-grid/types/grid';
import { GRID_ACTIVE_CELL_ID, GridAccessibilityLayer } from '@/labs/large-data-grid/components/grid/overlays/a11y';
import { GridSelectionOverlay } from '@/labs/large-data-grid/components/grid/overlays/selection';
const COLUMNS: readonly GridColumn[] = [
  {
    filterable: true,
    id: 'column-1',
    kind: 'text',
    label: 'First',
    maxWidthCssPx: 300,
    minWidthCssPx: 60,
    sortable: true,
    widthCssPx: 100,
  },
  {
    filterable: true,
    id: 'column-2',
    kind: 'text',
    label: 'Second',
    maxWidthCssPx: 300,
    minWidthCssPx: 60,
    sortable: true,
    widthCssPx: 120,
  },
  {
    filterable: true,
    id: 'column-3',
    kind: 'text',
    label: 'Third',
    maxWidthCssPx: 300,
    minWidthCssPx: 60,
    sortable: true,
    widthCssPx: 140,
  },
];
const VIEWPORT: GridViewport = {
  devicePixelRatio: 1,
  heightCssPx: 560,
  logicalScrollLeftCssPx: 10,
  logicalScrollTopCssPx: 52,
  widthCssPx: 960,
};
const RANGE: GridVisibleRange = {
  columnEnd: 2,
  columnStart: 0,
  rowEnd: 25,
  rowStart: 0,
};
describe('large data grid bounded overlays', () => {
  it('renders only the intersecting selection rectangle', () => {
    const columnAxis = new GridColumnAxis(COLUMNS);
    render(
      <GridSelectionOverlay
        activeColumnIndex={null}
        activeText={null}
        activeViewRowIndex={null}
        columnAxis={columnAxis}
        range={RANGE}
        rowHeightCssPx={26}
        viewport={VIEWPORT}
        bounds={{
          columnEnd: 2,
          columnStart: 1,
          rowEnd: 12,
          rowStart: 10,
        }}
      />,
    );
    const overlay = screen.getByTestId('large-data-grid-selection-overlay');
    const rectangle = overlay.querySelector('rect');
    expect(rectangle?.getAttribute('x')).toBe('162');
    expect(rectangle?.getAttribute('y')).toBe('240');
    expect(rectangle?.getAttribute('width')).toBe('260');
    expect(rectangle?.getAttribute('height')).toBe('78');
  });
  it('exposes one bounded active cell with one-based aria indices', () => {
    render(
      <GridAccessibilityLayer
        activeColumnIndex={1}
        activeText="ready"
        activeViewRowIndex={9}
        activeCell={{
          columnId: 'column-2',
          rowId: 'row-0000010',
        }}
      />,
    );
    const cell = screen.getByRole('gridcell', {
      name: 'ready',
    });
    expect(cell.id).toBe(GRID_ACTIVE_CELL_ID);
    expect(cell.getAttribute('aria-colindex')).toBe('2');
    expect(cell.parentElement?.getAttribute('aria-rowindex')).toBe('11');
  });
});
