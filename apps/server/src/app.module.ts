import { Module } from '@nestjs/common';

import { EnvironmentModule } from './config/environment.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';

@Module({
  imports: [EnvironmentModule, PrismaModule, RedisModule, HealthModule],
})
export class AppModule {}
