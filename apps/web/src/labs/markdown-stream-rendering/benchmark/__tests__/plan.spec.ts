import { createBenchmarkPlan } from '../plan';
import type { IsolatedBenchmarkConfiguration } from '../../types/benchmark';
const CONFIGURATION: IsolatedBenchmarkConfiguration = {
  chunkRange: [12, 32],
  fixtureId: 'mixed',
  fps: 60,
  instanceCount: 1,
  mode: 'char',
  roundCount: 3,
  seed: 5005,
};
describe('createBenchmarkPlan', () => {
  it('creates two executions per round and alternates renderer order', () => {
    const plan = createBenchmarkPlan(CONFIGURATION);
    expect(
      plan.executions.map((execution) => {
        return [execution.round, execution.renderer];
      }),
    ).toEqual([
      [1, 'legacy'],
      [1, 'incremental'],
      [2, 'incremental'],
      [2, 'legacy'],
      [3, 'legacy'],
      [3, 'incremental'],
    ]);
    expect(plan.executions).toHaveLength(CONFIGURATION.roundCount * 2);
  });
  it('creates stable execution ids for the same configuration', () => {
    const first = createBenchmarkPlan(CONFIGURATION);
    const second = createBenchmarkPlan(CONFIGURATION);
    expect(first).toEqual(second);
    expect(
      new Set(
        first.executions.map((execution) => {
          return execution.id;
        }),
      ).size,
    ).toBe(first.executions.length);
  });
  it('supports a ten-round production benchmark', () => {
    const plan = createBenchmarkPlan({
      ...CONFIGURATION,
      roundCount: 10,
    });
    expect(plan.executions).toHaveLength(20);
    expect(
      plan.executions.slice(-2).map((execution) => {
        return execution.renderer;
      }),
    ).toEqual(['incremental', 'legacy']);
  });
});
