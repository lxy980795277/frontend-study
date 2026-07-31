import { createSignature } from '../core/diff/signature';
import { summarizeRenderer } from './statistics';
import type {
  BenchmarkConsistency,
  BenchmarkEnvironment,
  BenchmarkExecutionResult,
  IsolatedBenchmarkConfiguration,
  IsolatedBenchmarkReport,
} from '@/labs/markdown-stream-rendering/types/benchmark';
export const createVisibleContentHash = (value: string): string => {
  const normalized = value.replace(/\s+/gu, ' ').trim();
  return createSignature(normalized).toString(36);
};
export const createBenchmarkConsistency = (results: readonly BenchmarkExecutionResult[]): BenchmarkConsistency => {
  const legacyHashes = getUniqueHashes(results, 'legacy');
  const incrementalHashes = getUniqueHashes(results, 'incremental');
  const allLengthsMatch = results.every((result) => {
    return result.contentMatchesExpectedLength;
  });
  return {
    incrementalHashes,
    legacyHashes,
    passed:
      results.length > 0 &&
      allLengthsMatch &&
      legacyHashes.length === 1 &&
      incrementalHashes.length === 1 &&
      legacyHashes[0] === incrementalHashes[0],
  };
};
export const createIsolatedBenchmarkReport = (
  configuration: IsolatedBenchmarkConfiguration,
  results: readonly BenchmarkExecutionResult[],
  environment: BenchmarkEnvironment,
  status: IsolatedBenchmarkReport['status'],
  generatedAt = new Date().toISOString(),
): IsolatedBenchmarkReport => {
  return {
    configuration,
    consistency: createBenchmarkConsistency(results),
    environment,
    executions: [...results],
    generatedAt,
    schemaVersion: 1,
    status,
    summary: {
      incremental: summarizeRenderer(results, 'incremental'),
      legacy: summarizeRenderer(results, 'legacy'),
    },
  };
};
export const readBenchmarkEnvironment = (): BenchmarkEnvironment => {
  if (typeof navigator === 'undefined') {
    return {
      deviceMemoryGb: null,
      hardwareConcurrency: null,
      userAgent: '',
    };
  }
  const navigatorWithMemory = navigator as Navigator & {
    deviceMemory?: number;
  };
  return {
    deviceMemoryGb: navigatorWithMemory.deviceMemory ?? null,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    userAgent: navigator.userAgent,
  };
};
const getUniqueHashes = (
  results: readonly BenchmarkExecutionResult[],
  renderer: BenchmarkExecutionResult['execution']['renderer'],
): string[] => {
  return [
    ...new Set(
      results
        .filter((result) => {
          return result.execution.renderer === renderer;
        })
        .map((result) => {
          return result.contentHash;
        }),
    ),
  ].sort();
};
