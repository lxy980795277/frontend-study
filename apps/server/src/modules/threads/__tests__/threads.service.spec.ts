import { v7 as uuidv7 } from 'uuid';

import type { PrismaService } from '../../../prisma/prisma.service.js';
import { ThreadsService } from '../threads.service.js';

describe('ThreadsService', () => {
  it('uses the active Run record instead of inferring runId from the last message', async () => {
    const threadId = uuidv7();
    const runId = uuidv7();
    const messageId = uuidv7();
    const now = new Date('2026-07-23T08:00:00.000Z');
    const input = {
      context: [],
      forwardedProps: { simulation: {} },
      messages: [{ content: '恢复运行', id: messageId, role: 'user' }],
      runId,
      state: {},
      threadId,
      tools: [],
    };
    const prisma = {
      thread: {
        findUnique: vi.fn().mockResolvedValue({
          createdAt: now,
          id: threadId,
          messages: [
            {
              createdAt: now,
              payload: input.messages[0],
              runId,
              status: 'COMPLETED',
              updatedAt: now,
            },
          ],
          runs: [
            {
              id: runId,
              inputSnapshot: input,
              startedAt: now,
              status: 'RUNNING',
            },
          ],
          title: '恢复运行',
          updatedAt: now,
        }),
      },
    } as unknown as PrismaService;
    const service = new ThreadsService(prisma);

    const detail = await service.detail(threadId);

    expect(detail.activeRun).toMatchObject({
      runId,
      status: 'RUNNING',
    });
    expect(detail.messages[0]?.runId).toBe(runId);
  });
});
