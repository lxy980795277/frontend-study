import type { AbortAgentRunRequest } from '@frontend-study/shared-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AbortAgentRunDto implements AbortAgentRunRequest {
  @ApiProperty({ description: 'UUIDv7 Run ID' })
  @IsUUID('7')
  runId!: string;

  @ApiProperty({ description: 'UUIDv7 Thread ID' })
  @IsUUID('7')
  threadId!: string;
}
