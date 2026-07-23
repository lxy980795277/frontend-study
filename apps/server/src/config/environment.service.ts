import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Environment } from './env.schema.js';

@Injectable()
export class EnvironmentService {
  constructor(private readonly configService: ConfigService<Environment, true>) {}

  get apiPrefix(): string {
    return this.configService.get('API_PREFIX', { infer: true });
  }

  get appPort(): number {
    return this.configService.get('APP_PORT', { infer: true });
  }

  get appVersion(): string {
    return this.configService.get('APP_VERSION', { infer: true });
  }

  get databaseHost(): string {
    return this.configService.get('DATABASE_HOST', { infer: true });
  }

  get databaseName(): 'frontend_study' {
    return this.configService.get('DATABASE_NAME', { infer: true });
  }

  get databasePassword(): string {
    return this.configService.get('DATABASE_PASSWORD', { infer: true });
  }

  get databasePort(): number {
    return this.configService.get('DATABASE_PORT', { infer: true });
  }

  get databaseUser(): string {
    return this.configService.get('DATABASE_USER', { infer: true });
  }

  get isProduction(): boolean {
    return this.configService.get('NODE_ENV', { infer: true }) === 'production';
  }

  get nodeEnvironment(): Environment['NODE_ENV'] {
    return this.configService.get('NODE_ENV', { infer: true });
  }

  get redisDatabase(): number {
    return this.configService.get('REDIS_DB', { infer: true });
  }

  get redisHost(): string {
    return this.configService.get('REDIS_HOST', { infer: true });
  }

  get redisKeyPrefix(): 'frontend-study:' {
    return this.configService.get('REDIS_KEY_PREFIX', { infer: true });
  }

  get redisPassword(): string | undefined {
    const password = this.configService.get('REDIS_PASSWORD', { infer: true });
    if (!password) {
      return undefined;
    }

    return password;
  }

  get redisPort(): number {
    return this.configService.get('REDIS_PORT', { infer: true });
  }

  get redisUsername(): string | undefined {
    return this.configService.get('REDIS_USERNAME', { infer: true });
  }

  get webOrigin(): string {
    return this.configService.get('WEB_ORIGIN', { infer: true });
  }
}
