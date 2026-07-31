import type { GridScrollState, GridScrollUpdate } from '../types/scroll';

export const DEFAULT_SAFE_SCROLL_EXTENT_CSS_PX = 4000000;

export const createGridScrollState = (
  logicalExtentCssPx: number,
  viewportExtentCssPx: number,
  safeExtentCssPx = DEFAULT_SAFE_SCROLL_EXTENT_CSS_PX,
): GridScrollState => {
  const logicalExtent = Math.max(viewportExtentCssPx, logicalExtentCssPx);
  const physicalExtent = Math.min(logicalExtent, Math.max(viewportExtentCssPx, safeExtentCssPx));
  const kind = logicalExtent <= physicalExtent ? 'direct' : 'segmented';

  // 浏览器只承载安全尺寸的物理滚动面，超大逻辑坐标由 base + physical 组合表达。
  const physicalMaximum = Math.max(0, physicalExtent - viewportExtentCssPx);
  return {
    guardBandCssPx: kind === 'direct' ? 0 : physicalMaximum * 0.25,
    kind,
    logicalBaseCssPx: 0,
    logicalExtentCssPx: logicalExtent,
    logicalScrollCssPx: 0,
    physicalAnchorCssPx: physicalMaximum / 2,
    physicalExtentCssPx: physicalExtent,
    physicalScrollCssPx: 0,
    viewportExtentCssPx,
  };
};
export const updatePhysicalScroll = (state: GridScrollState, physicalScrollCssPx: number): GridScrollUpdate => {
  const physicalMaximum = getPhysicalMaximum(state);
  const logicalMaximum = getLogicalMaximum(state);
  const physical = clamp(physicalScrollCssPx, 0, physicalMaximum);
  if (state.kind === 'direct') {
    return {
      didRebase: false,
      state: {
        ...state,
        logicalScrollCssPx: physical,
        physicalScrollCssPx: physical,
      },
    };
  }
  const logical = clamp(state.logicalBaseCssPx + physical, 0, logicalMaximum);
  const nearStart = logical <= state.guardBandCssPx;
  const nearEnd = logical >= logicalMaximum - state.guardBandCssPx;
  const outsideGuard = physical < state.guardBandCssPx || physical > physicalMaximum - state.guardBandCssPx;
  if (!outsideGuard || nearStart || nearEnd) {
    return {
      didRebase: false,
      state: {
        ...state,
        logicalScrollCssPx: logical,
        physicalScrollCssPx: physical,
      },
    };
  }
  const nextBase = clamp(logical - state.physicalAnchorCssPx, 0, Math.max(0, logicalMaximum - physicalMaximum));

  // 在 guard band 外重置物理锚点，但保持 logical 不变，用户不会感知跳动。
  const nextPhysical = logical - nextBase;
  return {
    didRebase: true,
    state: {
      ...state,
      logicalBaseCssPx: nextBase,
      logicalScrollCssPx: logical,
      physicalScrollCssPx: nextPhysical,
    },
  };
};
export const jumpToLogicalScroll = (state: GridScrollState, logicalScrollCssPx: number): GridScrollUpdate => {
  const logicalMaximum = getLogicalMaximum(state);
  const physicalMaximum = getPhysicalMaximum(state);
  const logical = clamp(logicalScrollCssPx, 0, logicalMaximum);
  if (state.kind === 'direct') {
    return {
      didRebase: false,
      state: {
        ...state,
        logicalScrollCssPx: logical,
        physicalScrollCssPx: logical,
      },
    };
  }
  let nextBase = logical - state.physicalAnchorCssPx;
  if (logical <= state.guardBandCssPx) {
    nextBase = 0;
  } else if (logical >= logicalMaximum - state.guardBandCssPx) {
    nextBase = logicalMaximum - physicalMaximum;
  }
  nextBase = clamp(nextBase, 0, Math.max(0, logicalMaximum - physicalMaximum));
  return {
    didRebase: true,
    state: {
      ...state,
      logicalBaseCssPx: nextBase,
      logicalScrollCssPx: logical,
      physicalScrollCssPx: logical - nextBase,
    },
  };
};
export const getLogicalMaximum = (state: GridScrollState): number => {
  return Math.max(0, state.logicalExtentCssPx - state.viewportExtentCssPx);
};
export const getPhysicalMaximum = (state: GridScrollState): number => {
  return Math.max(0, state.physicalExtentCssPx - state.viewportExtentCssPx);
};
const clamp = (value: number, minimum: number, maximum: number): number => {
  return Math.min(maximum, Math.max(minimum, value));
};
