const BENCHMARK_ASSET_PATH = '/fixtures/markdown-stream-rendering/llm-benchmark.md';
export class BenchmarkLoadError extends Error {
  readonly retryable: boolean;
  readonly status: number;
  constructor(message: string, status: number, retryable = true) {
    super(message);
    this.name = 'BenchmarkLoadError';
    this.retryable = retryable;
    this.status = status;
  }
}
export const loadBenchmarkMarkdown = async (signal?: AbortSignal): Promise<string> => {
  let response: Response;
  try {
    response = await fetch(BENCHMARK_ASSET_PATH, {
      cache: 'force-cache',
      headers: {
        Accept: 'text/markdown, text/plain;q=0.9',
      },
      signal,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new BenchmarkLoadError('超大 Markdown 基准加载失败，请重试。', 0);
  }
  if (!response.ok) {
    throw new BenchmarkLoadError(`超大 Markdown 基准加载失败（HTTP ${response.status}）。`, response.status);
  }
  const source = await response.text();
  if (source.trim().length === 0) {
    throw new BenchmarkLoadError('超大 Markdown 基准文件为空。', response.status, false);
  }
  return source;
};
