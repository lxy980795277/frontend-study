import type { EnvironmentService } from '../../config/environment.service.js';
import { RedisService } from '../redis.service.js';

const environment = {
  redisDatabase: 1,
  redisHost: '127.0.0.1',
  redisKeyPrefix: 'frontend-study:',
  redisPassword: 'secret',
  redisPort: 6379,
  redisUsername: undefined,
} as EnvironmentService;

describe('RedisService', () => {
  it('adds the project prefix to scan patterns', () => {
    const service = new RedisService(environment);

    expect(service.buildScanPattern('queue:*')).toBe('frontend-study:queue:*');
    expect(service.buildScanPattern(':queue:*')).toBe('frontend-study:queue:*');
  });
});
