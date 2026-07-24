import { Module } from '@nestjs/common';

import { EnvironmentModule } from './config/environment.module.js';
import { AgentStreamModule } from './modules/agent-stream/agent-stream.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ThreadsModule } from './modules/threads/threads.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';

@Module({
  imports: [EnvironmentModule, PrismaModule, RedisModule, HealthModule, ThreadsModule, AgentStreamModule],
})
export class AppModule {}
