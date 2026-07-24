import type { ApiErrorBody } from '@frontend-study/shared-types';

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

export interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  acceptedStatuses?: number[];
  body?: unknown;
  headers?: HeadersInit;
  params?: object;
  rawResponse?: boolean;
  timeoutMs?: number;
}

interface ErrorResponseBody extends Partial<ApiErrorBody> {
  [key: string]: unknown;
}

export class RequestError extends Error {
  readonly body: unknown;
  readonly code: string;
  readonly retryable: boolean;
  readonly status: number;

  constructor(options: { body?: unknown; code: string; message: string; retryable: boolean; status: number }) {
    super(options.message);
    this.name = 'RequestError';
    this.body = options.body;
    this.code = options.code;
    this.retryable = options.retryable;
    this.status = options.status;
  }
}

const isRetryableStatus = (status: number): boolean => {
  return status === 408 || status === 429 || status >= 500;
};

const buildUrlWithParams = (url: string, params?: object): string => {
  if (!params) {
    return url;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  if (!query) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${query}`;
};

const buildBody = (body: unknown): BodyInit | undefined => {
  if (body === undefined) {
    return undefined;
  }

  if (typeof body === 'string' || body instanceof Blob || body instanceof FormData || body instanceof URLSearchParams) {
    return body;
  }

  return JSON.stringify(body);
};

const readErrorBody = async (response: Response): Promise<ErrorResponseBody | null> => {
  try {
    return (await response.json()) as ErrorResponseBody;
  } catch {
    return null;
  }
};

export const createResponseError = async (response: Response): Promise<RequestError> => {
  const body = await readErrorBody(response);
  const rawMessage = body?.message;
  const message = Array.isArray(rawMessage) ? rawMessage.join('；') : rawMessage;

  return new RequestError({
    body,
    code: typeof body?.code === 'string' ? body.code : `HTTP_${response.status}`,
    message: typeof message === 'string' && message.length > 0 ? message : response.statusText || '请求失败',
    retryable: isRetryableStatus(response.status),
    status: response.status,
  });
};

const composeRequestSignal = (
  callerSignal: AbortSignal | null | undefined,
  timeoutMs: number,
): {
  cleanup: () => void;
  didTimeout: () => boolean;
  signal: AbortSignal;
} => {
  const controller = new AbortController();
  let timedOut = false;

  const handleCallerAbort = (): void => {
    controller.abort(callerSignal?.reason);
  };

  if (callerSignal?.aborted) {
    handleCallerAbort();
  } else {
    callerSignal?.addEventListener('abort', handleCallerAbort, { once: true });
  }

  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Request timeout', 'TimeoutError'));
  }, timeoutMs);

  return {
    cleanup: () => {
      globalThis.clearTimeout(timeoutId);
      callerSignal?.removeEventListener('abort', handleCallerAbort);
    },
    didTimeout: () => {
      return timedOut;
    },
    signal: controller.signal,
  };
};

const parseSuccessResponse = async <T>(response: Response, rawResponse: boolean): Promise<T> => {
  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json()) as unknown;
  if (rawResponse || typeof data !== 'object' || data === null) {
    return data as T;
  }

  if ('data' in data) {
    return data.data as T;
  }

  if ('value' in data) {
    return data.value as T;
  }

  return data as T;
};

export const request = async <T>(url: string, options: RequestOptions = {}): Promise<T> => {
  const {
    acceptedStatuses = [],
    body,
    headers: customHeaders,
    params,
    rawResponse = false,
    signal: callerSignal,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    ...requestInit
  } = options;
  const finalUrl = buildUrlWithParams(url, params);
  const resolvedBody = buildBody(body);
  const headers = new Headers(customHeaders);
  headers.set('Accept', 'application/json');

  if (resolvedBody !== undefined && !(resolvedBody instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const composedSignal = composeRequestSignal(callerSignal, timeoutMs);

  try {
    const response = await fetch(finalUrl, {
      cache: 'no-store',
      credentials: 'include',
      ...requestInit,
      body: resolvedBody,
      headers,
      signal: composedSignal.signal,
    });

    if (!response.ok && !acceptedStatuses.includes(response.status)) {
      throw await createResponseError(response);
    }

    return await parseSuccessResponse<T>(response, rawResponse);
  } catch (error) {
    if (error instanceof RequestError) {
      throw error;
    }

    if (composedSignal.didTimeout()) {
      throw new RequestError({
        code: 'REQUEST_TIMEOUT',
        message: `请求超时（${timeoutMs}ms）`,
        retryable: true,
        status: 0,
      });
    }

    if (callerSignal?.aborted) {
      throw error;
    }

    throw new RequestError({
      body: error,
      code: 'NETWORK_ERROR',
      message: '网络连接异常',
      retryable: true,
      status: 0,
    });
  } finally {
    composedSignal.cleanup();
  }
};

export const get = <T>(
  url: string,
  params?: object,
  options?: Omit<RequestOptions, 'body' | 'method' | 'params'>,
): Promise<T> => {
  return request<T>(url, { ...options, method: 'GET', params });
};

export const post = <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'body' | 'method'>): Promise<T> => {
  return request<T>(url, { ...options, body, method: 'POST' });
};

export const del = <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'body' | 'method'>): Promise<T> => {
  return request<T>(url, { ...options, body, method: 'DELETE' });
};
