import { paintGridFrame } from '../core/canvas-painter';
import { createWindowFrameClock, LatestFrameScheduler } from '../core/frame-scheduler';
import type {
  GridFrameSnapshot,
  GridRenderer,
  GridRendererCallbacks,
  GridRendererMountContext,
} from '@/labs/large-data-grid/types/renderer';
export class MainCanvasRenderer implements GridRenderer {
  readonly kind = 'main-canvas' as const;
  private context: GridRendererMountContext | null = null;
  private drawingContext: CanvasRenderingContext2D | null = null;
  private readonly scheduler: LatestFrameScheduler<GridFrameSnapshot>;
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: GridRendererCallbacks,
  ) {
    this.scheduler = new LatestFrameScheduler(createWindowFrameClock(), (snapshot) => {
      this.draw(snapshot);
    });
  }
  mount = (context: GridRendererMountContext): void => {
    const drawingContext = this.canvas.getContext('2d', {
      alpha: false,
    });
    if (!drawingContext) {
      this.callbacks.onError('浏览器无法创建 Canvas 2D Context。');
      return;
    }
    this.context = context;
    this.drawingContext = drawingContext;
    this.callbacks.onReady();
  };
  update = (snapshot: GridFrameSnapshot): void => {
    this.scheduler.push(snapshot);
  };
  updateContext = (context: Pick<GridRendererMountContext, 'columnAxis' | 'dataSource'>): void => {
    if (!this.context) {
      return;
    }
    this.context = {
      ...this.context,
      ...context,
    };
  };
  dispose = (): void => {
    this.scheduler.dispose();
    this.context = null;
    this.drawingContext = null;
  };
  private draw = (snapshot: GridFrameSnapshot): void => {
    if (!this.context || !this.drawingContext) {
      return;
    }
    const backingWidth = Math.max(1, Math.round(snapshot.viewport.widthCssPx * snapshot.viewport.devicePixelRatio));
    const backingHeight = Math.max(1, Math.round(snapshot.viewport.heightCssPx * snapshot.viewport.devicePixelRatio));
    if (this.canvas.width !== backingWidth || this.canvas.height !== backingHeight) {
      this.canvas.width = backingWidth;
      this.canvas.height = backingHeight;
    }
    const metrics = paintGridFrame({
      columnAxis: this.context.columnAxis,
      context: this.drawingContext,
      dataSource: this.context.dataSource,
      snapshot,
      theme: this.context.theme,
    });
    this.callbacks.onFrameDrawn(metrics);
  };
}
