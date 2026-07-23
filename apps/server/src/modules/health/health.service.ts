import type { HealthComponent } from '@frontend-study/shared-types';
import { Injectable, Logger } from '@nestjs/common';

import { EnvironmentService } from '../../config/environment.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { HealthResponseDto } from './dto/health-response.dto.js';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly environment: EnvironmentService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<HealthResponseDto> {
    const [mysql, redis] = await Promise.all([
      this.measure('mysql', async () => {
        await this.prisma.ping();
      }),
      this.measure('redis', async () => {
        await this.redis.ping();
      }),
    ]);

    let status: HealthResponseDto['status'] = 'degraded';
    if (mysql.status === 'up' && redis.status === 'up') {
      status = 'ok';
    }

    return {
      checks: {
        mysql,
        redis,
      },
      service: 'frontend-study-server',
      status,
      timestamp: new Date().toISOString(),
      uptime: Number(process.uptime().toFixed(2)),
      version: this.environment.appVersion,
    };
  }

  private async measure(name: 'mysql' | 'redis', operation: () => Promise<void>): Promise<HealthComponent> {
    const startedAt = performance.now();

    try {
      await operation();
      return {
        latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
        status: 'up',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown dependency error';
      this.logger.error(`${name} health check failed: ${message}`);
      return {
        latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
        status: 'down',
      };
    }
  }
}
