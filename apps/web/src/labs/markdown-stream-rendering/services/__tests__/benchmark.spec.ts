import type { BenchmarkLoadError } from '../benchmark';
import { loadBenchmarkMarkdown } from '../benchmark';
describe('loadBenchmarkMarkdown', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('loads the static Markdown source as text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('# Benchmark', {
        headers: {
          'Content-Type': 'text/markdown',
        },
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadBenchmarkMarkdown()).resolves.toBe('# Benchmark');
    expect(fetchMock).toHaveBeenCalledWith(
      '/fixtures/markdown-stream-rendering/llm-benchmark.md',
      expect.objectContaining({
        cache: 'force-cache',
      }),
    );
  });
  it('returns a stable retryable error for a failed static asset request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('Unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
        }),
      ),
    );
    await expect(loadBenchmarkMarkdown()).rejects.toEqual(
      expect.objectContaining<Partial<BenchmarkLoadError>>({
        name: 'BenchmarkLoadError',
        retryable: true,
        status: 503,
      }),
    );
  });
});
