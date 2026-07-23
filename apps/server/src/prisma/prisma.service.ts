import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { EnvironmentService } from '../config/environment.service.js';
import { PrismaClient } from '../generated/prisma/client.js';

const CONNECTION_LIMIT = 5;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor(environment: EnvironmentService) {
    const adapter = new PrismaMariaDb({
      connectionLimit: CONNECTION_LIMIT,
      database: environment.databaseName,
      host: environment.databaseHost,
      password: environment.databasePassword,
      port: environment.databasePort,
      user: environment.databaseUser,
    });

    super({
      adapter,
      log: environment.isProduction ? ['info', 'warn', 'error'] : [],
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('MySQL connection closed');
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('MySQL connection established');
  }

  async ping(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }
}
