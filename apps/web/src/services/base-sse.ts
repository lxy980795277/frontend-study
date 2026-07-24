import { createResponseError, RequestError } from './base-request';

const DEFAULT_MAX_EVENT_SIZE = 1024 * 1024;

export interface SseEvent<T> {
  data: T;
  event: string | null;
  id: string | null;
  retry: number | null;
}

export type SseParserRecord =
  | {
      comment: string;
      kind: 'comment';
    }
  | {
      data: string;
      event: string | null;
      id: string | null;
      kind: 'event';
      retry: number | null;
    };

export class SseProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SseProtocolError';
  }
}

export class SseTextParser {
  private readonly maxEventSize: number;
  private currentDataSize = 0;
  private dataLines: string[] = [];
  private eventName: string | null = null;
  private eventId: string | null = null;
  private lineBuffer = '';
  private retry: number | null = null;
  private skipNextLineFeed = false;

  constructor(maxEventSize = DEFAULT_MAX_EVENT_SIZE) {
    this.maxEventSize = maxEventSize;
  }

  feed(chunk: string): SseParserRecord[] {
    const records: SseParserRecord[] = [];

    for (const character of chunk) {
      if (character === '\r') {
        records.push(...this.processLine(this.lineBuffer));
        this.lineBuffer = '';
        this.skipNextLineFeed = true;
        continue;
      }

      if (character === '\n') {
        if (this.skipNextLineFeed) {
          this.skipNextLineFeed = false;
          continue;
        }

        records.push(...this.processLine(this.lineBuffer));
        this.lineBuffer = '';
        continue;
      }

      this.skipNextLineFeed = false;
      this.lineBuffer += character;
      if (this.lineBuffer.length + this.currentDataSize > this.maxEventSize) {
        throw new SseProtocolError('SSE event exceeds the configured size limit');
      }
    }

    return records;
  }

  finish(): SseParserRecord[] {
    const records = this.processLine(this.lineBuffer);
    this.lineBuffer = '';
    records.push(...this.dispatchEvent());
    return records;
  }

  private dispatchEvent(): SseParserRecord[] {
    if (this.dataLines.length === 0) {
      this.resetEvent();
      return [];
    }

    const record: SseParserRecord = {
      data: this.dataLines.join('\n'),
      event: this.eventName,
      id: this.eventId,
      kind: 'event',
      retry: this.retry,
    };
    this.resetEvent();
    return [record];
  }

  private processLine(line: string): SseParserRecord[] {
    if (line.length === 0) {
      return this.dispatchEvent();
    }

    if (line.startsWith(':')) {
      return [{ comment: line.slice(1).trimStart(), kind: 'comment' }];
    }

    const separatorIndex = line.indexOf(':');
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    let value = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1);
    if (value.startsWith(' ')) {
      value = value.slice(1);
    }

    if (field === 'data') {
      this.dataLines.push(value);
      this.currentDataSize += value.length;
    } else if (field === 'event') {
      this.eventName = value;
    } else if (field === 'id' && !value.includes('\0')) {
      this.eventId = value;
    } else if (field === 'retry' && /^\d+$/.test(value)) {
      this.retry = Number(value);
    }

    if (this.currentDataSize > this.maxEventSize) {
      throw new SseProtocolError('SSE event exceeds the configured size limit');
    }

    return [];
  }

  private resetEvent(): void {
    this.currentDataSize = 0;
    this.dataLines = [];
    this.eventName = null;
    this.eventId = null;
    this.retry = null;
  }
}

export interface PostSseOptions<T> {
  body: unknown;
  headers?: HeadersInit;
  maxEventSize?: number;
  onComment?: (comment: string) => void;
  onEvent: (event: SseEvent<T>) => void;
  onOpen?: () => void;
  signal?: AbortSignal;
}

export interface SseCompletion {
  reason: 'aborted' | 'eof';
}

const parseEventData = <T>(record: Extract<SseParserRecord, { kind: 'event' }>): SseEvent<T> => {
  try {
    return {
      data: JSON.parse(record.data) as T,
      event: record.event,
      id: record.id,
      retry: record.retry,
    };
  } catch {
    throw new SseProtocolError('SSE data is not valid JSON');
  }
};

const processRecords = <T>(records: SseParserRecord[], options: PostSseOptions<T>): void => {
  records.forEach((record) => {
    if (record.kind === 'comment') {
      options.onComment?.(record.comment);
      return;
    }

    options.onEvent(parseEventData<T>(record));
  });
};

export const postSse = async <T>(url: string, options: PostSseOptions<T>): Promise<SseCompletion> => {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'text/event-stream');
  headers.set('Content-Type', 'application/json');

  try {
    const response = await fetch(url, {
      body: JSON.stringify(options.body),
      cache: 'no-store',
      credentials: 'include',
      headers,
      method: 'POST',
      signal: options.signal,
    });

    if (!response.ok) {
      throw await createResponseError(response);
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.startsWith('text/event-stream')) {
      throw new SseProtocolError('Response Content-Type is not text/event-stream');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new SseProtocolError('Response body is not readable');
    }
    options.onOpen?.();

    const decoder = new TextDecoder('utf-8');
    const parser = new SseTextParser(options.maxEventSize);

    try {
      while (true) {
        const result = await reader.read();
        if (result.done) {
          processRecords(parser.feed(decoder.decode()), options);
          processRecords(parser.finish(), options);
          return { reason: 'eof' };
        }

        processRecords(parser.feed(decoder.decode(result.value, { stream: true })), options);
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    if (options.signal?.aborted) {
      return { reason: 'aborted' };
    }

    if (error instanceof RequestError || error instanceof SseProtocolError) {
      throw error;
    }

    throw new RequestError({
      body: error,
      code: 'NETWORK_ERROR',
      message: 'SSE 网络连接异常',
      retryable: true,
      status: 0,
    });
  }
};
