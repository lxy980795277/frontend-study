import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm --dir ../server dev',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: 'http://127.0.0.1:3101/api/health',
    },
    {
      command: 'pnpm dev',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: 'http://127.0.0.1:3100',
    },
  ],
});
