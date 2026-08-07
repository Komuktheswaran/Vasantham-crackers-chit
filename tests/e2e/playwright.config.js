// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'https://103.38.50.247';

module.exports = defineConfig({
  testDir: './specs',
  fullyParallel: false,        // Auth state is shared — don't race
  retries: process.env.CI ? 2 : 0,
  workers: 1,                  // Single worker; serial runs are friendlier to prod
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Self-signed cert on the deployed server
    ignoreHTTPSErrors: true,
    // Reasonable defaults for an internal CRUD app
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
