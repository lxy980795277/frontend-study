import type { AGUIEvent } from '@frontend-study/shared-types';

const removeLineBreaks = (value: string): string => {
  return value.replace(/[\r\n]/g, '');
};

export const encodeSseEvent = (streamId: string, event: AGUIEvent): string => {
  return `id: ${removeLineBreaks(streamId)}\ndata: ${JSON.stringify(event)}\n\n`;
};

export const encodeSseHeartbeat = (): string => {
  return ': heartbeat\n\n';
};
