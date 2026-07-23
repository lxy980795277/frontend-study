import type { HealthComponentStatus } from '@frontend-study/shared-types';

import type { EnvironmentService } from '../../../config/environment.service.js';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { RedisService } from '../../../redis/redis.service.js';
import { HealthService } from '../health.service.js';

interface DependencyMock {
  ping: ReturnType<typeof vi.fn>;
}

const createService = (mysqlStatus: HealthComponentStatus, redisStatus: HealthComponentStatus): HealthService => {
  const prisma: DependencyMock = {
    ping: vi.fn(() => {
      if (mysqlStatus === 'down') {
        return Promise.reject(new Error('mysql unavailable'));
      }

      return Promise.resolve();
    }),
  };
  const redis: DependencyMock = {
    ping: vi.fn(() => {
      if (redisStatus === 'down') {
        return Promise.reject(new Error('redis unavailable'));
      }

      return Promise.resolve();
    }),
  };
  const environment = {
    appVersion: '0.0.0',
  };

  return new HealthService(
    environment as EnvironmentService,
    prisma as unknown as PrismaService,
    redis as unknown as RedisService,
  );
};

describe('HealthService', () => {
  it('returns ok when all dependencies are available', async () => {
    const service = createService('up', 'up');

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.checks.mysql.status).toBe('up');
    expect(result.checks.redis.status).toBe('up');
  });

  it('returns degraded when MySQL is unavailable', async () => {
    const service = createService('down', 'up');

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.checks.mysql.status).toBe('down');
    expect(result.checks.redis.status).toBe('up');
  });

  it('returns degraded when Redis is unavailable', async () => {
    const service = createService('up', 'down');

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.checks.mysql.status).toBe('up');
    expect(result.checks.redis.status).toBe('down');
  });
});
