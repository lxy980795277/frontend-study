import { Transform, type TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateThreadDto {
  @ApiPropertyOptional({
    description: 'Thread 标题；为空时由第一条用户消息生成',
    maxLength: 120,
  })
  @Transform(({ value }: TransformFnParams): unknown => {
    return typeof value === 'string' ? value.trim() : value;
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}
