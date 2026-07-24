import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CreateThreadDto } from './dto/create-thread.dto.js';
import { ThreadListQueryDto } from './dto/thread-list-query.dto.js';
import { ThreadParamDto } from './dto/thread-param.dto.js';
import { ThreadDetailDto, ThreadListResponseDto, ThreadSummaryDto } from './dto/thread-response.dto.js';
import { ThreadsService } from './threads.service.js';

@ApiTags('Threads')
@Controller('threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @ApiOperation({ summary: '创建 Agent Thread' })
  @ApiCreatedResponse({ type: ThreadSummaryDto })
  @Post()
  create(@Body() input: CreateThreadDto): Promise<ThreadSummaryDto> {
    return this.threadsService.create(input);
  }

  @ApiOperation({ summary: '删除指定 Agent Thread' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Thread 不存在' })
  @ApiConflictResponse({ description: 'Thread 仍有活跃 Run' })
  @Delete(':threadId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param() params: ThreadParamDto): Promise<void> {
    return this.threadsService.delete(params.threadId);
  }

  @ApiOperation({ summary: '获取 Agent Thread 详情、历史消息和活跃 Run' })
  @ApiOkResponse({ type: ThreadDetailDto })
  @ApiNotFoundResponse({ description: 'Thread 不存在' })
  @Get(':threadId')
  detail(@Param() params: ThreadParamDto): Promise<ThreadDetailDto> {
    return this.threadsService.detail(params.threadId);
  }

  @ApiOperation({ summary: '分页获取 Agent Thread' })
  @ApiOkResponse({ type: ThreadListResponseDto })
  @Get()
  list(@Query() query: ThreadListQueryDto): Promise<ThreadListResponseDto> {
    return this.threadsService.list(query.limit, query.cursor);
  }
}
