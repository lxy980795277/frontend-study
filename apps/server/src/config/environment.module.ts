import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from './env.schema.js';
import { EnvironmentService } from './environment.service.js';

const appEnvironment = process.env.APP_ENV?.trim() || 'dev';

@Global()
@Module({
  exports: [EnvironmentService],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: [`env/.env.${appEnvironment}`],
      isGlobal: true,
      validate: validateEnvironment,
    }),
  ],
  providers: [EnvironmentService],
})
export class EnvironmentModule {}
