import type { HealthResponse } from '@frontend-study/shared-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';

import { HealthPanel } from '@/components/home/health-panel';

const HEALTH_ENDPOINT = 'http://localhost:3000/backend/health';
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
} satisfies HealthResponse;

const server = setupServer(
  http.get(HEALTH_ENDPOINT, () => {
    return HttpResponse.json(HEALTHY_RESPONSE);
  }),
);

beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
  });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('HealthPanel', () => {
  it('renders dependency status returned by the server', async () => {
    render(<HealthPanel />);

    expect(await screen.findByText('Prisma · 远程 MySQL')).toBeTruthy();
    expect(screen.getByText('node-redis · DB 1')).toBeTruthy();
    expect(screen.getAllByText('运行正常')).toHaveLength(3);
  });

  it('supports retrying a failed health request', async () => {
    server.use(
      http.get(HEALTH_ENDPOINT, () => {
        return HttpResponse.json(
          {
            message: 'temporary failure',
          },
          {
            status: 500,
          },
        );
      }),
    );
    render(<HealthPanel />);

    expect(await screen.findByText('无法连接后端服务')).toBeTruthy();

    server.use(
      http.get(HEALTH_ENDPOINT, () => {
        return HttpResponse.json(HEALTHY_RESPONSE);
      }),
    );
    await userEvent.setup().click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByText('Prisma · 远程 MySQL')).toBeTruthy();
  });
});
