import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ThreadParamDto {
  @ApiProperty({ description: 'UUIDv7 Thread ID' })
  @IsUUID('7')
  threadId!: string;
}
