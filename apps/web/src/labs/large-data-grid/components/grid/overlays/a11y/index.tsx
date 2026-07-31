import type { FC } from 'react';

import type { GridCellRef } from '@/labs/large-data-grid/types/grid';
interface GridAccessibilityLayerProps {
  activeCell: GridCellRef | null;
  activeColumnIndex: number | null;
  activeText: string | null;
  activeViewRowIndex: number | null;
}
export const GRID_ACTIVE_CELL_ID = 'large-data-grid-active-cell';
export const GridAccessibilityLayer: FC<GridAccessibilityLayerProps> = ({
  activeCell,
  activeColumnIndex,
  activeText,
  activeViewRowIndex,
}) => {
  if (activeCell === null || activeColumnIndex === null || activeText === null || activeViewRowIndex === null) {
    return null;
  }
  return (
    <div className="sr-only">
      <div aria-rowindex={activeViewRowIndex + 2} role="row">
        <div aria-colindex={activeColumnIndex + 1} id={GRID_ACTIVE_CELL_ID} role="gridcell">
          {activeText}
        </div>
      </div>
    </div>
  );
};
