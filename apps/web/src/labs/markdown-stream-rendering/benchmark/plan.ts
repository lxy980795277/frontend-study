import type {
  BenchmarkExecution,
  BenchmarkPlan,
  BenchmarkRenderer,
  IsolatedBenchmarkConfiguration,
} from '@/labs/markdown-stream-rendering/types/benchmark';
export const createBenchmarkPlan = (configuration: IsolatedBenchmarkConfiguration): BenchmarkPlan => {
  const executions: BenchmarkExecution[] = [];
  for (let round = 1; round <= configuration.roundCount; round += 1) {
    const renderers: readonly BenchmarkRenderer[] =
      round % 2 === 1 ? ['legacy', 'incremental'] : ['incremental', 'legacy'];
    renderers.forEach((renderer) => {
      executions.push(createExecution(renderer, round, executions.length));
    });
  }
  return {
    configuration,
    executions,
  };
};
const createExecution = (renderer: BenchmarkRenderer, round: number, order: number): BenchmarkExecution => {
  return {
    id: `round-${String(round)}-${renderer}-${String(order + 1)}`,
    order,
    renderer,
    round,
  };
};
