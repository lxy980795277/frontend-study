import type { GridCanvasTheme } from '@/labs/large-data-grid/types/grid';
export const supportsWorkerOffscreenCanvas = (canvas: HTMLCanvasElement): boolean => {
  return typeof Worker === 'function' && typeof canvas.transferControlToOffscreen === 'function';
};
export const readGridCanvasTheme = (element: HTMLElement): GridCanvasTheme => {
  const styles = window.getComputedStyle(element);
  const read = (name: string): string => {
    const value = styles.getPropertyValue(name).trim();
    if (value.length === 0) {
      throw new Error(`Missing semantic color token ${name}`);
    }
    return value;
  };
  return {
    accent: read('--accent'),
    background: read('--background'),
    border: read('--border'),
    foreground: read('--foreground'),
    muted: read('--muted'),
    mutedForeground: read('--muted-foreground'),
    primary: read('--primary'),
    primaryForeground: read('--primary-foreground'),
    selection: `color-mix(in oklch, ${read('--primary')} 14%, transparent)`,
  };
};
