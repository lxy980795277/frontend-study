import type { HealthResponse } from '@frontend-study/shared-types';
import { request } from './base-request';
const HEALTH_ENDPOINT = '/backend/health';
export const getHealth = async (signal?: AbortSignal): Promise<HealthResponse> => {
  return request<HealthResponse>(HEALTH_ENDPOINT, {
    acceptedStatuses: [503],
    method: 'GET',
    signal,
  });
};
