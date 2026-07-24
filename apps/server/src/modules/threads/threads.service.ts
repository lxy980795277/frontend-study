import {
  ACTIVE_AGENT_RUN_STATUSES,
  AGENT_STREAM_ERROR_CODES,
  type ActiveAgentRunStatus,
  type LabRunAgentInput,
  MESSAGE_PERSISTENCE_STATUSES,
  MessageSchema,
  RunAgentInputSchema,
  type ThreadMessage,
} from '@frontend-study/shared-types';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';

import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateThreadDto } from './dto/create-thread.dto.js';
import type { ThreadDetailDto, ThreadListResponseDto, ThreadSummaryDto } from './dto/thread-response.dto.js';

interface ThreadCursor {
  id: string;
  updatedAt: string;
}

const ACTIVE_STATUS_VALUES: ActiveAgentRunStatus[] = [...ACTIVE_AGENT_RUN_STATUSES];

const createApiError = (statusCode: number, code: string, message: string): Record<string, unknown> => {
  return { code, message, statusCode };
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const encodeCursor = (cursor: ThreadCursor): string => {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
};

const decodeCursor = (cursor: string): ThreadCursor => {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown;
    if (typeof parsed !== 'object' || parsed === null || !('id' in parsed) || !('updatedAt' in parsed)) {
      throw new Error('invalid cursor');
    }

    const { id, updatedAt } = parsed;
    if (typeof id !== 'string' || typeof updatedAt !== 'string' || Number.isNaN(Date.parse(updatedAt))) {
      throw new Error('invalid cursor');
    }

    return { id, updatedAt };
  } catch {
    throw new BadRequestException(createApiError(400, 'INVALID_CURSOR', 'Thread 分页游标无效'));
  }
};

const parseRunInput = (input: unknown): LabRunAgentInput => {
  const result = RunAgentInputSchema.safeParse(input);
  if (!result.success) {
    throw new InternalServerErrorException('Run input snapshot is invalid');
  }

  const state: unknown = result.data.state;
  const forwardedProps: unknown = result.data.forwardedProps;
  if (
    !isRecord(state) ||
    Object.keys(state).length > 0 ||
    result.data.tools.length > 0 ||
    result.data.context.length > 0 ||
    !isRecord(forwardedProps)
  ) {
    throw new InternalServerErrorException('Run input snapshot violates lab constraints');
  }

  return result.data as LabRunAgentInput;
};

const parseThreadMessage = (row: {
  createdAt: Date;
  payload: unknown;
  runId: string;
  status: string;
  updatedAt: Date;
}): ThreadMessage => {
  const messageResult = MessageSchema.safeParse(row.payload);
  if (!messageResult.success || !(MESSAGE_PERSISTENCE_STATUSES as readonly string[]).includes(row.status)) {
    throw new InternalServerErrorException('Persisted AG-UI message is invalid');
  }

  return {
    createdAt: row.createdAt.toISOString(),
    message: messageResult.data,
    runId: row.runId,
    status: row.status as ThreadMessage['status'],
    updatedAt: row.updatedAt.toISOString(),
  };
};

@Injectable()
export class ThreadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateThreadDto): Promise<ThreadSummaryDto> {
    const thread = await this.prisma.thread.create({
      data: {
        id: uuidv7(),
        title: input.title || null,
      },
      select: {
        createdAt: true,
        id: true,
        title: true,
        updatedAt: true,
      },
    });

    return {
      activeRun: null,
      createdAt: thread.createdAt.toISOString(),
      id: thread.id,
      title: thread.title,
      updatedAt: thread.updatedAt.toISOString(),
    };
  }

  async delete(threadId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM t_threads
        WHERE id = ${threadId}
        FOR UPDATE
      `;
      if (rows.length === 0) {
        throw new NotFoundException(createApiError(404, AGENT_STREAM_ERROR_CODES.THREAD_NOT_FOUND, 'Thread 不存在'));
      }

      const activeRun = await transaction.agentRun.findFirst({
        select: { id: true },
        where: {
          status: { in: ACTIVE_STATUS_VALUES },
          threadId,
        },
      });
      if (activeRun) {
        throw new ConflictException(
          createApiError(409, AGENT_STREAM_ERROR_CODES.THREAD_HAS_ACTIVE_RUN, '活跃 Run 结束前不能删除 Thread'),
        );
      }

      await transaction.thread.delete({ where: { id: threadId } });
    });
  }

  async detail(threadId: string): Promise<ThreadDetailDto> {
    const thread = await this.prisma.thread.findUnique({
      select: {
        createdAt: true,
        id: true,
        messages: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            createdAt: true,
            payload: true,
            runId: true,
            status: true,
            updatedAt: true,
          },
        },
        runs: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            inputSnapshot: true,
            startedAt: true,
            status: true,
          },
          take: 1,
          where: { status: { in: ACTIVE_STATUS_VALUES } },
        },
        title: true,
        updatedAt: true,
      },
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException(createApiError(404, AGENT_STREAM_ERROR_CODES.THREAD_NOT_FOUND, 'Thread 不存在'));
    }

    const activeRun = thread.runs[0];

    return {
      activeRun: activeRun
        ? {
            input: parseRunInput(activeRun.inputSnapshot),
            runId: activeRun.id,
            startedAt: activeRun.startedAt?.toISOString() ?? null,
            status: activeRun.status as ActiveAgentRunStatus,
          }
        : null,
      createdAt: thread.createdAt.toISOString(),
      id: thread.id,
      messages: thread.messages.map(parseThreadMessage),
      title: thread.title,
      updatedAt: thread.updatedAt.toISOString(),
    };
  }

  async list(limit: number, cursor?: string): Promise<ThreadListResponseDto> {
    const decodedCursor = cursor ? decodeCursor(cursor) : null;
    const rows = await this.prisma.thread.findMany({
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: {
        createdAt: true,
        id: true,
        runs: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            startedAt: true,
            status: true,
          },
          take: 1,
          where: { status: { in: ACTIVE_STATUS_VALUES } },
        },
        title: true,
        updatedAt: true,
      },
      take: limit + 1,
      where: decodedCursor
        ? {
            OR: [
              { updatedAt: { lt: new Date(decodedCursor.updatedAt) } },
              {
                id: { lt: decodedCursor.id },
                updatedAt: new Date(decodedCursor.updatedAt),
              },
            ],
          }
        : undefined,
    });

    const hasNextPage = rows.length > limit;
    const pageRows = hasNextPage ? rows.slice(0, limit) : rows;
    const items: ThreadSummaryDto[] = pageRows.map((thread) => {
      const activeRun = thread.runs[0];
      return {
        activeRun: activeRun
          ? {
              runId: activeRun.id,
              startedAt: activeRun.startedAt?.toISOString() ?? null,
              status: activeRun.status as ActiveAgentRunStatus,
            }
          : null,
        createdAt: thread.createdAt.toISOString(),
        id: thread.id,
        title: thread.title,
        updatedAt: thread.updatedAt.toISOString(),
      };
    });
    const lastItem = pageRows.at(-1);

    return {
      items,
      nextCursor:
        hasNextPage && lastItem
          ? encodeCursor({
              id: lastItem.id,
              updatedAt: lastItem.updatedAt.toISOString(),
            })
          : null,
    };
  }
}
