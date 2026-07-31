import type { GridBenchmarkConfiguration, GridBenchmarkExecutionResult, GridBenchmarkReport } from '../types/benchmark';
export const createGridBenchmarkReport = (
  configuration: GridBenchmarkConfiguration,
  executions: readonly GridBenchmarkExecutionResult[],
  status: GridBenchmarkReport['status'],
): GridBenchmarkReport => {
  const navigatorWithMemory = navigator as Navigator & {
    deviceMemory?: number;
  };
  const memorySupported = window.crossOriginIsolated && 'measureUserAgentSpecificMemory' in performance;
  return {
    configuration,
    environment: {
      deviceMemoryGb: navigatorWithMemory.deviceMemory ?? null,
      hardwareConcurrency: navigator.hardwareConcurrency || null,
      memory: {
        reason: memorySupported
          ? 'available-but-not-sampled-during-short-benchmark'
          : 'API unavailable or page is not cross-origin isolated',
        supported: memorySupported,
      },
      userAgent: navigator.userAgent,
    },
    executions,
    generatedAt: new Date().toISOString(),
    schemaVersion: 1,
    status,
  };
};
export const downloadGridBenchmarkReport = (report: GridBenchmarkReport): void => {
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.download = `large-data-grid-benchmark-${report.generatedAt.replaceAll(/[:.]/gu, '-')}.json`;
  anchor.href = url;
  anchor.click();
  URL.revokeObjectURL(url);
};
