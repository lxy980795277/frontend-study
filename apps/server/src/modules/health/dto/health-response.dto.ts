import type { HealthComponentStatus, HealthResponse } from '@frontend-study/shared-types';
import { ApiProperty } from '@nestjs/swagger';

class HealthComponentDto {
  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  status!: HealthComponentStatus;

  @ApiProperty({ example: 12, minimum: 0 })
  latencyMs!: number;
}

export class HealthResponseDto implements HealthResponse {
  @ApiProperty({ enum: ['ok', 'degraded'], example: 'ok' })
  status!: 'ok' | 'degraded';

  @ApiProperty({ example: 'frontend-study-server' })
  service!: string;

  @ApiProperty({ example: '0.0.0' })
  version!: string;

  @ApiProperty({ example: '2026-07-23T08:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: 120.5, minimum: 0 })
  uptime!: number;

  @ApiProperty({
    example: {
      mysql: {
        latencyMs: 18,
        status: 'up',
      },
      redis: {
        latencyMs: 7,
        status: 'up',
      },
    },
  })
  checks!: {
    mysql: HealthComponentDto;
    redis: HealthComponentDto;
  };
}
