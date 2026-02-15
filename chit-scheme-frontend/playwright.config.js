// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  timeout: 180000,
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  
  // Enhanced reporting
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],
  
  use: {
    ignoreHTTPSErrors: true,
    baseURL: 'https://103.38.50.149:5005',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      args: ['--disable-web-security', '--ignore-certificate-errors']
    }
  },
  
  projects: [
    // === CHROMIUM FAMILY (100+ versions) ===
    {
      name: 'chromium-latest',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chromium',  // Playwright Chromium ~130
      },
    },
    {
      name: 'chrome-stable',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',  // Official Chrome Stable ~129
      },
    },
    {
      name: 'chrome-beta',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome-beta',  // Chrome Beta ~130
      },
    },
    {
      name: 'msedge-stable',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge',  // Microsoft Edge ~129
      },
    },

    // === FIREFOX ===
    {
      name: 'firefox-stable',
      use: { 
        ...devices['Desktop Firefox'],
        channel: 'firefox',  // Firefox ~131
      },
    },

    // === WEBKIT/SAFARI (macOS only) ===
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],  // Safari 17+
      },
    },

    // === MOBILE DEVICES - iOS ===
    {
      name: 'iphone-14',
      use: { 
        ...devices['iPhone 14'],
      },
    },
    {
      name: 'iphone-14-pro-max',
      use: { 
        ...devices['iPhone 14 Pro Max'],
      },
    },
    {
      name: 'iphone-se',
      use: { 
        ...devices['iPhone SE'],  // Small screen test
      },
    },
    {
      name: 'ipad-pro',
      use: { 
        ...devices['iPad Pro'],
      },
    },
    {
      name: 'ipad-mini',
      use: { 
        ...devices['iPad Mini'],
      },
    },

    // === MOBILE DEVICES - Android ===
    {
      name: 'pixel-8',
      use: { 
        ...devices['Pixel 8'],
      },
    },
    {
      name: 'pixel-5',
      use: { 
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'galaxy-s21',
      use: { 
        ...devices['Galaxy S21'],
      },
    },
    {
      name: 'galaxy-tab-s4',
      use: { 
        ...devices['Galaxy Tab S4'],  // Android tablet
      },
    },

    // === DESKTOP VIEWPORTS ===
    {
      name: 'desktop-1080p',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'desktop-1440p',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 },
      },
    },
    {
      name: 'desktop-4k',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 3840, height: 2160 },
      },
    },

    // === LAPTOP SIZES ===
    {
      name: 'laptop-13inch',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'laptop-15inch',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
      },
    },
  ],
});
