import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';

import { EnvironmentService } from '../config/environment.service.js';

const MAX_RECONNECT_ATTEMPTS = 3;
type RedisClient = RedisClientType<Record<string, never>, Record<string, never>, Record<string, never>, 2>;

@Injectable()
export class RedisService implements OnModuleDestroy, OnModuleInit {
  private readonly client: RedisClient;
  private readonly keyPrefix: string;
  private readonly logger = new Logger(RedisService.name);

  constructor(environment: EnvironmentService) {
    this.keyPrefix = environment.redisKeyPrefix;

    const username = environment.redisUsername;
    this.client = createClient({
      RESP: 2,
      database: environment.redisDatabase,
      keyPrefix: this.keyPrefix,
      password: environment.redisPassword,
      socket: {
        connectTimeout: 5_000,
        host: environment.redisHost,
        port: environment.redisPort,
        reconnectStrategy: (retries: number) => {
          if (retries >= MAX_RECONNECT_ATTEMPTS) {
            return new Error('Redis reconnect attempts exhausted');
          }

          return Math.min(100 * 2 ** retries, 1_000);
        },
      },
      username,
    });

    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis client error: ${error.message}`);
    });
  }

  buildScanPattern(pattern: string): string {
    const normalizedSuffix = pattern.replace(/^:+/, '');
    return `${this.keyPrefix}${normalizedSuffix}`;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    await this.ping();
    this.logger.log('Redis DB 1 connection established');
  }

  async ping(): Promise<void> {
    const response = await this.client.ping();
    if (response !== 'PONG') {
      throw new Error('Redis PING returned an unexpected response');
    }
  }
}
