import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module.js';
import { EnvironmentService } from './config/environment.service.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const environment = app.get(EnvironmentService);
  const logger = new Logger('Bootstrap');

  app.enableCors({
    credentials: true,
    origin: environment.webOrigin,
  });
  app.enableShutdownHooks();
  app.setGlobalPrefix(environment.apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  if (!environment.isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setDescription('AI Frontend Engineering Lab API')
      .setTitle('Frontend Study API')
      .setVersion(environment.appVersion)
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${environment.apiPrefix}/docs`, app, document);
  }

  await app.listen(environment.appPort);

  logger.log(`API: http://localhost:${environment.appPort}/${environment.apiPrefix}`);
  logger.log(`Health: http://localhost:${environment.appPort}/${environment.apiPrefix}/health`);
  if (!environment.isProduction) {
    logger.log(`Swagger: http://localhost:${environment.appPort}/${environment.apiPrefix}/docs`);
  }
}

void bootstrap();
