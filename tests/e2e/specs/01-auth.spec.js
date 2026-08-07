// @ts-check
const { test, expect } = require('@playwright/test');

const USER = process.env.E2E_USER || 'admin';
const PASS = process.env.E2E_PASS || 'admin123';

test.describe('Auth', () => {
  test('login → land on dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[name="username"], input[type="text"]').first().fill(USER);
    await page.locator('input[type="password"]').first().fill(PASS);
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes('/login')),
      page.locator('button[type="submit"]').click(),
    ]);
    // App should land on dashboard or root
    expect(page.url()).not.toContain('/login');
  });

  test('rejects bad credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[name="username"], input[type="text"]').first().fill(USER);
    await page.locator('input[type="password"]').first().fill('not-the-real-password');
    await page.locator('button[type="submit"]').click();
    // Stay on /login OR show an error message — both are valid behaviour
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/login');
  });
});
