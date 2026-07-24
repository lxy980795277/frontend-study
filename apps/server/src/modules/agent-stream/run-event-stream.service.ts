import { EventSchemas, type AGUIEvent, type AgentRunStatus } from '@frontend-study/shared-types';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { type AppRedisClient, RedisService } from '../../redis/redis.service.js';

const ACTIVE_STREAM_TTL_SECONDS = 60 * 60;
const ABORT_TTL_SECONDS = 10 * 60;
const BLOCK_TIMEOUT_MS = 10_000;
const LOCK_RENEW_INTERVAL_MS = 10_000;
const LOCK_TTL_MS = 30_000;
const MAX_STREAM_LENGTH = 10_000;
const TERMINAL_STREAM_TTL_SECONDS = 30 * 60;

const RELEASE_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

const RENEW_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('PEXPIRE', KEYS[1], ARGV[2])
end
return 0
`;

const PUBLISH_TERMINAL_SCRIPT = `
local existing = redis.call('GET', KEYS[2])
if existing then
  return existing
end
local streamId = redis.call(
  'XADD',
  KEYS[1],
  'MAXLEN',
  '~',
  ARGV[1],
  '*',
  'event',
  ARGV[2]
)
redis.call('SET', KEYS[2], streamId, 'EX', ARGV[3])
redis.call('EXPIRE', KEYS[1], ARGV[3])
return streamId
`;

export interface RunStreamRecord {
  event: AGUIEvent;
  id: string;
}

export interface ProducerLock {
  renewIntervalMs: number;
  runId: string;
  token: string;
}

const getEventKey = (runId: string): string => {
  return `agent-stream:runs:${runId}:events`;
};

const getLockKey = (runId: string): string => {
  return `agent-stream:runs:${runId}:producer-lock`;
};

const getAbortKey = (runId: string): string => {
  return `agent-stream:runs:${runId}:abort`;
};

const getRuntimeKey = (runId: string): string => {
  return `agent-stream:runs:${runId}:runtime`;
};

const getTerminalMarkerKey = (runId: string): string => {
  return `agent-stream:runs:${runId}:terminal-published`;
};

const parseStreamResponse = (response: unknown): RunStreamRecord[] => {
  if (!Array.isArray(response) || response.length === 0) {
    return [];
  }

  const stream: unknown = response[0];
  if (!Array.isArray(stream)) {
    throw new InternalServerErrorException('Redis XREAD response is malformed');
  }
  const entries: unknown = stream[1];
  if (!Array.isArray(entries)) {
    throw new InternalServerErrorException('Redis XREAD response is malformed');
  }

  return entries.map((entry: unknown): RunStreamRecord => {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string') {
      throw new InternalServerErrorException('Redis Stream entry is malformed');
    }

    const fields: unknown = entry[1];
    if (!Array.isArray(fields)) {
      throw new InternalServerErrorException('Redis Stream entry is malformed');
    }
    let serializedEvent: string | null = null;
    for (let index = 0; index < fields.length; index += 2) {
      const fieldValue: unknown = fields[index + 1];
      if (fields[index] === 'event' && typeof fieldValue === 'string') {
        serializedEvent = fieldValue;
        break;
      }
    }

    if (!serializedEvent) {
      throw new InternalServerErrorException('Redis Stream event field is missing');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(serializedEvent) as unknown;
    } catch {
      throw new InternalServerErrorException('Redis Stream event JSON is invalid');
    }

    const eventResult = EventSchemas.safeParse(parsed);
    if (!eventResult.success) {
      throw new InternalServerErrorException('Redis Stream contains an invalid AG-UI event');
    }

    return {
      event: eventResult.data,
      id: entry[0],
    };
  });
};

const parseRedisId = (id: string): [bigint, bigint] | null => {
  const match = /^(\d+)-(\d+)$/.exec(id);
  if (!match) {
    return null;
  }

  return [BigInt(match[1]!), BigInt(match[2]!)];
};

const isBefore = (left: string, right: string): boolean => {
  const leftParts = parseRedisId(left);
  const rightParts = parseRedisId(right);
  if (!leftParts || !rightParts) {
    return false;
  }

  if (leftParts[0] !== rightParts[0]) {
    return leftParts[0] < rightParts[0];
  }

  return leftParts[1] < rightParts[1];
};

export const isCursorWithinRange = (cursor: string, firstEventId: string, lastEventId: string): boolean => {
  if (!parseRedisId(cursor) || !parseRedisId(firstEventId) || !parseRedisId(lastEventId)) {
    return false;
  }

  return !isBefore(cursor, firstEventId) && !isBefore(lastEventId, cursor);
};

@Injectable()
export class RunEventStreamService {
  constructor(private readonly redis: RedisService) {}

  async acquireProducerLock(runId: string): Promise<ProducerLock | null> {
    const token = randomUUID();
    const response: unknown = await this.redis.execute((client) => {
      return client.sendCommand([
        'SET',
        this.redis.buildKey(getLockKey(runId)),
        token,
        'NX',
        'PX',
        String(LOCK_TTL_MS),
      ]);
    });

    if (response !== 'OK') {
      return null;
    }

    return {
      renewIntervalMs: LOCK_RENEW_INTERVAL_MS,
      runId,
      token,
    };
  }

  async append(runId: string, event: AGUIEvent): Promise<string> {
    const eventResult = EventSchemas.safeParse(event);
    if (!eventResult.success) {
      throw new InternalServerErrorException('Producer emitted an invalid AG-UI event');
    }

    const key = this.redis.buildKey(getEventKey(runId));
    const response = await this.redis.execute(async (client) => {
      const streamId = await client.sendCommand([
        'XADD',
        key,
        'MAXLEN',
        '~',
        String(MAX_STREAM_LENGTH),
        '*',
        'event',
        JSON.stringify(eventResult.data),
      ]);
      await client.sendCommand(['EXPIRE', key, String(ACTIVE_STREAM_TTL_SECONDS)]);
      return streamId;
    });

    if (typeof response !== 'string') {
      throw new InternalServerErrorException('Redis XADD did not return a Stream ID');
    }

    return response;
  }

  async closeReader(client: AppRedisClient): Promise<void> {
    if (client.isOpen) {
      await client.quit();
    }
  }

  async createReader(): Promise<AppRedisClient> {
    return this.redis.createIsolatedClient();
  }

  destroyReader(client: AppRedisClient): void {
    if (client.isOpen) {
      client.destroy();
    }
  }

  async getFirstEventId(runId: string): Promise<string | null> {
    const response: unknown = await this.redis.execute((client) => {
      return client.sendCommand(['XRANGE', this.redis.buildKey(getEventKey(runId)), '-', '+', 'COUNT', '1']);
    });
    if (!Array.isArray(response) || response.length === 0 || !Array.isArray(response[0])) {
      return null;
    }

    return typeof response[0][0] === 'string' ? response[0][0] : null;
  }

  async getLastEventId(runId: string): Promise<string | null> {
    const response: unknown = await this.redis.execute((client) => {
      return client.sendCommand(['XREVRANGE', this.redis.buildKey(getEventKey(runId)), '+', '-', 'COUNT', '1']);
    });
    if (!Array.isArray(response) || response.length === 0 || !Array.isArray(response[0])) {
      return null;
    }

    return typeof response[0][0] === 'string' ? response[0][0] : null;
  }

  async hasAbortSignal(runId: string): Promise<boolean> {
    const response: unknown = await this.redis.execute((client) => {
      return client.sendCommand(['EXISTS', this.redis.buildKey(getAbortKey(runId))]);
    });
    return response === 1;
  }

  async isCursorAvailable(runId: string, cursor: string): Promise<boolean> {
    if (!parseRedisId(cursor)) {
      return false;
    }

    const [firstEventId, lastEventId] = await Promise.all([this.getFirstEventId(runId), this.getLastEventId(runId)]);
    if (!firstEventId || !lastEventId) {
      return false;
    }

    return isCursorWithinRange(cursor, firstEventId, lastEventId);
  }

  async publishTerminal(runId: string, event: AGUIEvent): Promise<string> {
    const eventResult = EventSchemas.safeParse(event);
    if (!eventResult.success) {
      throw new InternalServerErrorException('Terminal AG-UI event is invalid');
    }

    const response: unknown = await this.redis.execute((client) => {
      return client.sendCommand([
        'EVAL',
        PUBLISH_TERMINAL_SCRIPT,
        '2',
        this.redis.buildKey(getEventKey(runId)),
        this.redis.buildKey(getTerminalMarkerKey(runId)),
        String(MAX_STREAM_LENGTH),
        JSON.stringify(eventResult.data),
        String(TERMINAL_STREAM_TTL_SECONDS),
      ]);
    });
    if (typeof response !== 'string') {
      throw new InternalServerErrorException('Redis terminal publish did not return a Stream ID');
    }

    return response;
  }

  async readBatch(client: AppRedisClient, runId: string, afterId: string): Promise<RunStreamRecord[]> {
    const response = await client.sendCommand([
      'XREAD',
      'BLOCK',
      String(BLOCK_TIMEOUT_MS),
      'COUNT',
      '100',
      'STREAMS',
      this.redis.buildKey(getEventKey(runId)),
      afterId,
    ]);

    return parseStreamResponse(response);
  }

  async releaseProducerLock(lock: ProducerLock): Promise<void> {
    await this.redis.execute((client) => {
      return client.sendCommand([
        'EVAL',
        RELEASE_LOCK_SCRIPT,
        '1',
        this.redis.buildKey(getLockKey(lock.runId)),
        lock.token,
      ]);
    });
  }

  async renewProducerLock(lock: ProducerLock): Promise<boolean> {
    const response: unknown = await this.redis.execute((client) => {
      return client.sendCommand([
        'EVAL',
        RENEW_LOCK_SCRIPT,
        '1',
        this.redis.buildKey(getLockKey(lock.runId)),
        lock.token,
        String(LOCK_TTL_MS),
      ]);
    });
    return response === 1;
  }

  async setAbortSignal(runId: string): Promise<void> {
    await this.redis.execute((client) => {
      return client.sendCommand(['SET', this.redis.buildKey(getAbortKey(runId)), '1', 'EX', String(ABORT_TTL_SECONDS)]);
    });
  }

  async setRuntime(runId: string, threadId: string, status: AgentRunStatus): Promise<void> {
    const key = this.redis.buildKey(getRuntimeKey(runId));
    await this.redis.execute(async (client) => {
      await client.sendCommand([
        'HSET',
        key,
        'threadId',
        threadId,
        'status',
        status,
        'heartbeatAt',
        new Date().toISOString(),
      ]);
      await client.sendCommand(['EXPIRE', key, String(ACTIVE_STREAM_TTL_SECONDS)]);
    });
  }
}
