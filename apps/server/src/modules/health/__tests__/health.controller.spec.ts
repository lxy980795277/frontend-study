import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { HealthController } from '../health.controller.js';
import { HealthService } from '../health.service.js';
import type { HealthResponseDto } from '../dto/health-response.dto.js';

const HEALTHY_RESPONSE = {
  checks: {
    mysql: {
      latencyMs: 8,
      status: 'up',
    },
    redis: {
      latencyMs: 3,
      status: 'up',
    },
  },
  service: 'frontend-study-server',
  status: 'ok',
  timestamp: '2026-07-23T08:00:00.000Z',
  uptime: 10,
  version: '0.0.0',
} satisfies HealthResponseDto;

const createApplication = async (response: HealthResponseDto): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [
      {
        provide: HealthService,
        useValue: {
          check: vi.fn().mockResolvedValue(response),
        },
      },
    ],
  }).compile();
  const application = moduleRef.createNestApplication();

  await application.init();

  return application;
};

describe('HealthController', () => {
  it('returns 200 when all dependencies are available', async () => {
    const application = await createApplication(HEALTHY_RESPONSE);
    const httpServer = application.getHttpServer() as Server;

    await request(httpServer).get('/health').expect(200).expect(HEALTHY_RESPONSE);
    await application.close();
  });

  it('returns 503 when a dependency is unavailable', async () => {
    const degradedResponse: HealthResponseDto = {
      ...HEALTHY_RESPONSE,
      checks: {
        ...HEALTHY_RESPONSE.checks,
        redis: {
          latencyMs: 0,
          status: 'down',
        },
      },
      status: 'degraded',
    };
    const application = await createApplication(degradedResponse);
    const httpServer = application.getHttpServer() as Server;

    await request(httpServer).get('/health').expect(503);
    await application.close();
  });
});
