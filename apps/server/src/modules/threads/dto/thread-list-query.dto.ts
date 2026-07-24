import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ThreadListQueryDto {
  @ApiPropertyOptional({ description: '不透明分页游标' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;

  @ApiPropertyOptional({ default: 30, maximum: 50, minimum: 1 })
  @IsInt()
  @IsOptional()
  @Max(50)
  @Min(1)
  @Type(() => Number)
  limit = 30;
}
