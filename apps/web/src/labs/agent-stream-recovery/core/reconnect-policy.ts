import { RequestError } from '@/services/base-request';
import { SseProtocolError } from '@/services/base-sse';
import type { RecoveryDecision } from '../types/runtime';

const BASE_DELAYS_MS = [300, 600, 1200, 2400, 5000] as const;

export const getRecoveryDecision = (error: unknown): RecoveryDecision => {
  if (error instanceof RequestError) {
    if (error.code === 'STREAM_EXPIRED') {
      return 'refresh-history';
    }
    return error.retryable ? 'retry' : 'fatal';
  }
  if (error instanceof SseProtocolError) {
    return 'fatal';
  }
  return 'fatal';
};
export const getReconnectDelay = (attempt: number, randomValue = Math.random()): number | null => {
  const baseDelay = BASE_DELAYS_MS[attempt - 1];
  if (baseDelay === undefined) {
    return null;
  }
  const jitter = Math.round(baseDelay * 0.2 * (randomValue * 2 - 1));
  return Math.max(0, baseDelay + jitter);
};
