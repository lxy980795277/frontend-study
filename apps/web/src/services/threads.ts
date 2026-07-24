import type {
  CreateThreadRequest,
  ThreadDetail,
  ThreadListQuery,
  ThreadListResponse,
  ThreadSummary,
} from '@frontend-study/shared-types';

import { del, get, post } from './base-request';

const THREADS_ENDPOINT = '/backend/threads';

export const threadsService = {
  create: (input: CreateThreadRequest = {}, signal?: AbortSignal): Promise<ThreadSummary> => {
    return post<ThreadSummary>(THREADS_ENDPOINT, input, { signal });
  },

  delete: (threadId: string, signal?: AbortSignal): Promise<void> => {
    return del<void>(`${THREADS_ENDPOINT}/${threadId}`, undefined, { signal });
  },

  detail: (threadId: string, signal?: AbortSignal): Promise<ThreadDetail> => {
    return get<ThreadDetail>(`${THREADS_ENDPOINT}/${threadId}`, undefined, { signal });
  },

  list: (query: ThreadListQuery = {}, signal?: AbortSignal): Promise<ThreadListResponse> => {
    return get<ThreadListResponse>(THREADS_ENDPOINT, query, { signal });
  },
};
