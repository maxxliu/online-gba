import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3001',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // Required for SharedArrayBuffer (COOP/COEP)
        launchOptions: {
          args: ['--enable-features=SharedArrayBuffer'],
        },
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- -p 3001',
    port: 3001,
    timeout: 30_000,
    reuseExistingServer: !process.env.CI,
  },
});
