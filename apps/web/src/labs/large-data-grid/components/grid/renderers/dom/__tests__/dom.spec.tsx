import { render, screen } from '@testing-library/react';

import { GridColumnAxis } from '@/labs/large-data-grid/core/column-axis';
import { DomVirtualGrid } from '@/labs/large-data-grid/components/grid/renderers/dom';
import type { GridDataSource } from '@/labs/large-data-grid/types/data';
import type { GridColumn, GridFrameMetrics } from '@/labs/large-data-grid/types/grid';
import type { GridFrameSnapshot } from '@/labs/large-data-grid/types/renderer';

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

const DATA_SOURCE: GridDataSource = {
  columns: COLUMNS,
  rowCount: 1_000_000,
  getCellText: (sourceRowIndex, columnIndex) => {
    return `row-${String(sourceRowIndex)}:column-${String(columnIndex)}`;
  },
  getComparableValue: (sourceRowIndex, columnIndex) => {
    return sourceRowIndex * COLUMNS.length + columnIndex;
  },
  getRowId: (sourceRowIndex) => {
    return `row-${String(sourceRowIndex)}`;
  },
};

const SNAPSHOT: GridFrameSnapshot = {
  activeColumnIndex: null,
  activeViewRowIndex: null,
  frameId: 1,
  projection: null,
  queryVersion: 0,
  rowHeightCssPx: 28,
  selectionBounds: null,
  viewport: {
    devicePixelRatio: 1,
    heightCssPx: 300,
    logicalScrollLeftCssPx: 0,
    logicalScrollTopCssPx: 280,
    widthCssPx: 640,
  },
  visibleRange: {
    columnEnd: 2,
    columnStart: 1,
    rowEnd: 12,
    rowStart: 10,
  },
};

describe('DomVirtualGrid', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders only the visible window with pure HTML elements', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
      return undefined;
    });
    const onFrameDrawn = vi.fn<(metrics: GridFrameMetrics) => void>();

    const { container } = render(
      <DomVirtualGrid
        columnAxis={new GridColumnAxis(COLUMNS)}
        dataSource={DATA_SOURCE}
        snapshot={SNAPSHOT}
        onFrameDrawn={onFrameDrawn}
      />,
    );

    const grid = screen.getByTestId('dom-virtual-grid');
    expect(grid.querySelectorAll('svg')).toHaveLength(0);
    expect(grid.querySelectorAll('foreignObject')).toHaveLength(0);
    expect(container.querySelectorAll('[data-grid-row]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-grid-cell]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-grid-column-header]')).toHaveLength(2);
    expect(screen.getByText('row-10:column-1')).toBeTruthy();
    expect(onFrameDrawn).toHaveBeenCalledWith(
      expect.objectContaining({
        drawnCellCount: 6,
        frameId: 1,
        range: SNAPSHOT.visibleRange,
      }),
    );
  });
});
