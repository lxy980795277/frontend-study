import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { HealthResponseDto } from './dto/health-response.dto.js';
import { HealthService } from './health.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: '检查 API、MySQL 和 Redis 状态' })
  @ApiResponse({ description: '所有依赖运行正常', status: 200, type: HealthResponseDto })
  @ApiResponse({ description: '至少一个依赖不可用', status: 503, type: HealthResponseDto })
  async check(): Promise<HealthResponseDto> {
    const response = await this.healthService.check();

    if (response.status === 'degraded') {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }
}
