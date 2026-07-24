import type { AgentStreamForwardedProps, LabRunAgentInput, Message } from '@frontend-study/shared-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsUUID } from 'class-validator';

export class AgentStreamDto implements LabRunAgentInput {
  @ApiProperty({ additionalProperties: true, isArray: true, type: 'object' })
  @IsArray()
  context!: [];

  @ApiProperty({ additionalProperties: true, type: 'object' })
  @IsObject()
  forwardedProps!: AgentStreamForwardedProps;

  @ApiProperty({ additionalProperties: true, isArray: true, type: 'object' })
  @IsArray()
  messages!: Message[];

  @ApiPropertyOptional({ description: '分支 Run 的父级；本 Lab 暂不使用' })
  @IsOptional()
  @IsUUID('7')
  parentRunId?: string;

  @ApiProperty({ description: 'UUIDv7 Run ID' })
  @IsUUID('7')
  runId!: string;

  @ApiProperty({ additionalProperties: true, type: 'object' })
  @IsObject()
  state!: Record<string, never>;

  @ApiProperty({ description: 'UUIDv7 Thread ID' })
  @IsUUID('7')
  threadId!: string;

  @ApiProperty({ additionalProperties: true, isArray: true, type: 'object' })
  @IsArray()
  tools!: [];
}
