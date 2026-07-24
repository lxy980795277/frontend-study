import type {
  ActiveAgentRunStatus,
  LabRunAgentInput,
  Message,
  MessagePersistenceStatus,
  ThreadActiveRun,
  ThreadActiveRunSummary,
  ThreadDetail,
  ThreadListResponse,
  ThreadMessage,
  ThreadSummary,
} from '@frontend-study/shared-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ThreadActiveRunSummaryDto implements ThreadActiveRunSummary {
  @ApiProperty()
  runId!: string;

  @ApiPropertyOptional({ nullable: true })
  startedAt!: string | null;

  @ApiProperty({ enum: ['PENDING', 'RUNNING', 'CANCELLING'] })
  status!: ActiveAgentRunStatus;
}

export class ThreadActiveRunDto extends ThreadActiveRunSummaryDto implements ThreadActiveRun {
  @ApiProperty({ additionalProperties: true, description: '创建 Run 时保存的完整 AG-UI Input', type: 'object' })
  input!: LabRunAgentInput;
}

export class ThreadSummaryDto implements ThreadSummary {
  @ApiPropertyOptional({ nullable: true, type: ThreadActiveRunSummaryDto })
  activeRun!: ThreadActiveRunSummaryDto | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  title!: string | null;

  @ApiProperty()
  updatedAt!: string;
}

export class ThreadMessageDto implements ThreadMessage {
  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ additionalProperties: true, description: '完整 AG-UI Message', type: 'object' })
  message!: Message;

  @ApiProperty()
  runId!: string;

  @ApiProperty({ enum: ['COMPLETED', 'INTERRUPTED'] })
  status!: MessagePersistenceStatus;

  @ApiProperty()
  updatedAt!: string;
}

export class ThreadDetailDto extends ThreadSummaryDto implements ThreadDetail {
  @ApiPropertyOptional({ nullable: true, type: ThreadActiveRunDto })
  declare activeRun: ThreadActiveRunDto | null;

  @ApiProperty({ isArray: true, type: ThreadMessageDto })
  messages!: ThreadMessageDto[];
}

export class ThreadListResponseDto implements ThreadListResponse {
  @ApiProperty({ isArray: true, type: ThreadSummaryDto })
  items!: ThreadSummaryDto[];

  @ApiPropertyOptional({ nullable: true })
  nextCursor!: string | null;
}
