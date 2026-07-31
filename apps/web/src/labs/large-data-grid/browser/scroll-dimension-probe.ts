import { DEFAULT_SAFE_SCROLL_EXTENT_CSS_PX } from '../core/scroll-model';
let cachedSafeExtent: number | null = null;
export const probeSafeScrollExtentCssPx = (): number => {
  if (cachedSafeExtent !== null) {
    return cachedSafeExtent;
  }
  if (typeof document === 'undefined' || !document.body) {
    return DEFAULT_SAFE_SCROLL_EXTENT_CSS_PX;
  }
  const host = document.createElement('div');
  host.className = 'ldg-scroll-dimension-probe';
  const surface = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  surface.setAttribute('width', '1');
  surface.setAttribute('height', String(DEFAULT_SAFE_SCROLL_EXTENT_CSS_PX));
  host.append(surface);
  document.body.append(host);
  const measured = Math.min(surface.getBoundingClientRect().height, host.scrollHeight);
  host.remove();
  cachedSafeExtent =
    Number.isFinite(measured) && measured > 0
      ? Math.min(DEFAULT_SAFE_SCROLL_EXTENT_CSS_PX, measured)
      : DEFAULT_SAFE_SCROLL_EXTENT_CSS_PX;
  return cachedSafeExtent;
};
export const resetScrollDimensionProbeForTest = (): void => {
  cachedSafeExtent = null;
};
