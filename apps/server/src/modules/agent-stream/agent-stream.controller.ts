import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBody,
  ApiConflictResponse,
  ApiGoneResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AbortAgentRunDto } from './dto/abort-agent-run.dto.js';
import { AbortAgentRunResponseDto } from './dto/abort-agent-run-response.dto.js';
import { AgentStreamDto } from './dto/agent-stream.dto.js';
import { AgentStreamService } from './agent-stream.service.js';
import { encodeSseEvent, encodeSseHeartbeat } from './sse-encoder.js';

const waitForDrainOrClose = async (response: Response): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    const cleanup = (): void => {
      response.off('close', handleClose);
      response.off('drain', handleDrain);
    };
    const handleClose = (): void => {
      cleanup();
      resolve(false);
    };
    const handleDrain = (): void => {
      cleanup();
      resolve(true);
    };

    response.once('close', handleClose);
    response.once('drain', handleDrain);
  });
};

const writeWithBackpressure = async (response: Response, payload: string): Promise<boolean> => {
  if (response.destroyed || response.writableEnded) {
    return false;
  }
  if (response.write(payload)) {
    return true;
  }

  return waitForDrainOrClose(response);
};

@ApiTags('Agent Stream')
@Controller('stream')
export class AgentStreamController {
  constructor(private readonly agentStreamService: AgentStreamService) {}

  @ApiOperation({ summary: '幂等终止指定 Agent Run' })
  @ApiAcceptedResponse({ type: AbortAgentRunResponseDto })
  @Post('abort')
  @HttpCode(HttpStatus.ACCEPTED)
  abort(@Body() input: AbortAgentRunDto): Promise<AbortAgentRunResponseDto> {
    return this.agentStreamService.abort(input.threadId, input.runId);
  }

  @ApiOperation({ summary: '创建或恢复 AG-UI Agent Run' })
  @ApiBody({ type: AgentStreamDto })
  @ApiProduces('text/event-stream')
  @ApiOkResponse({ description: 'AG-UI SSE Event Stream' })
  @ApiConflictResponse({ description: 'runId Input 冲突或 Thread 已有活跃 Run' })
  @ApiGoneResponse({ description: 'Redis Stream 已过期' })
  @Post()
  async stream(
    @Body() input: AgentStreamDto,
    @Headers('last-event-id') lastEventId: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const openedStream = await this.agentStreamService.open(input, lastEventId);
    const connectionAbortController = new AbortController();
    const handleClose = (): void => {
      connectionAbortController.abort();
    };
    response.on('close', handleClose);
    response.status(HttpStatus.OK);
    response.set({
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders();

    try {
      for await (const delivery of this.agentStreamService.consume(
        openedStream.runId,
        lastEventId,
        connectionAbortController.signal,
      )) {
        if (connectionAbortController.signal.aborted) {
          break;
        }

        if (delivery.kind === 'heartbeat') {
          if (!(await writeWithBackpressure(response, encodeSseHeartbeat()))) {
            break;
          }
          continue;
        }

        if (!(await writeWithBackpressure(response, encodeSseEvent(delivery.record.id, delivery.record.event)))) {
          break;
        }
      }
    } finally {
      response.off('close', handleClose);
      if (!response.writableEnded) {
        response.end();
      }
    }
  }
}
