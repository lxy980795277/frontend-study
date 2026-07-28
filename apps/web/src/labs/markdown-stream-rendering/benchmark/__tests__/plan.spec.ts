import { createBenchmarkPlan } from '../plan';
import type { IsolatedBenchmarkConfiguration } from '../types';

const CONFIGURATION: IsolatedBenchmarkConfiguration = {
  chunkRange: [12, 32],
  fixtureId: 'mixed',
  fps: 60,
  instanceCount: 1,
  mode: 'char',
  roundCount: 3,
  seed: 5_005,
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
    expect(new Set(first.executions.map((execution) => execution.id)).size).toBe(first.executions.length);
  });
});
