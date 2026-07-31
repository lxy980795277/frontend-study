import { createGridBenchmarkPlan, createGridScrollTrace } from '../plan';
import { summarizeGridLatency } from '../statistics';
describe('large data grid benchmark plan', () => {
  it('rotates all three renderers across three rounds', () => {
    const plan = createGridBenchmarkPlan({
      columnCount: 100,
      roundCount: 3,
      rowCount: 1000000,
      traceLength: 180,
      viewportHeightCssPx: 560,
      viewportWidthCssPx: 960,
    });
    expect(
      plan.map((execution) => {
        return execution.renderer;
      }),
    ).toEqual([
      'dom',
      'main-canvas',
      'worker-offscreen',
      'main-canvas',
      'worker-offscreen',
      'dom',
      'worker-offscreen',
      'dom',
      'main-canvas',
    ]);
    expect(
      new Set(
        plan.map((execution) => {
          return execution.id;
        }),
      ).size,
    ).toBe(9);
  });
  it('creates a deterministic trace that reaches both endpoints', () => {
    const first = createGridScrollTrace(1000000, 180);
    const second = createGridScrollTrace(1000000, 180);
    expect(first).toEqual(second);
    expect(first).toHaveLength(180);
    expect(first[0]).toBe(0);
    expect(first.at(-1)).toBe(999999);
  });
  it('summarizes nearest-rank latency samples', () => {
    expect(summarizeGridLatency([4, 1, 3, 2, 20])).toEqual({
      average: 6,
      maximum: 20,
      p50: 3,
      p95: 20,
    });
  });
});
