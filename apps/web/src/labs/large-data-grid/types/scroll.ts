export interface GridScrollState {
  guardBandCssPx: number;
  kind: 'direct' | 'segmented';
  logicalBaseCssPx: number;
  logicalExtentCssPx: number;
  logicalScrollCssPx: number;
  physicalAnchorCssPx: number;
  physicalExtentCssPx: number;
  physicalScrollCssPx: number;
  viewportExtentCssPx: number;
}

export interface GridScrollUpdate {
  didRebase: boolean;
  state: GridScrollState;
}

export interface GridLogicalScroll {
  leftCssPx: number;
  topCssPx: number;
}

export type GridLogicalScrollSetter = (
  value: GridLogicalScroll | ((current: GridLogicalScroll) => GridLogicalScroll),
) => void;
