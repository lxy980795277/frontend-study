import { act, renderHook, waitFor } from '@testing-library/react';
import { BENCHMARK_COPY_COUNT, BENCHMARK_SEPARATOR } from '../../fixtures/benchmark';
import { useBenchmarkBaseline } from '../use-benchmark-baseline';
const createValidBenchmark = (): string => {
  const code = Array.from({ length: 300 }, (_, index) => {
    return `const line${index + 1} = ${index + 1};`;
  }).join('\n');
  return `# Production report

\`\`\`ts
${code}
\`\`\`

\`\`\`ts
${code}
\`\`\``;
};
describe('useBenchmarkBaseline', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('loads, validates and expands one source into a ten-copy baseline', async () => {
    const source = createValidBenchmark();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(source, {
          status: 200,
        }),
      ),
    );
    const { result } = renderHook(() => {
      return useBenchmarkBaseline();
    });
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(result.current.copyCount).toBe(BENCHMARK_COPY_COUNT);
    expect(result.current.inspection?.codeBlockLineCounts).toEqual([300, 300]);
    expect(result.current.baseline.split(BENCHMARK_SEPARATOR)).toHaveLength(BENCHMARK_COPY_COUNT);
  });
  it('exposes a retry path after a static asset failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('Unavailable', {
          status: 503,
        }),
      )
      .mockResolvedValueOnce(
        new Response(createValidBenchmark(), {
          status: 200,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => {
      return useBenchmarkBaseline();
    });
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    act(() => {
      result.current.retry();
    });
    expect(result.current.status).toBe('loading');
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
