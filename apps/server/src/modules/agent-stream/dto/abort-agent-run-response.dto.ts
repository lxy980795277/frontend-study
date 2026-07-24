import type { AbortAgentRunResponse, AgentRunStatus } from '@frontend-study/shared-types';
import { ApiProperty } from '@nestjs/swagger';

export class AbortAgentRunResponseDto implements AbortAgentRunResponse {
  @ApiProperty()
  runId!: string;

  @ApiProperty({
    enum: ['PENDING', 'RUNNING', 'CANCELLING', 'SUCCEEDED', 'FAILED', 'ABORTED'],
  })
  status!: AgentRunStatus;

  @ApiProperty()
  threadId!: string;
}
