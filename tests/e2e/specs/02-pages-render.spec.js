// @ts-check
const { test, expect } = require('@playwright/test');

const USER = process.env.E2E_USER || 'admin';
const PASS = process.env.E2E_PASS || 'admin123';

// Log in once per worker, reuse the session for the rest of the suite.
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[name="username"], input[type="text"]').first().fill(USER);
  await page.locator('input[type="password"]').first().fill(PASS);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/login')),
    page.locator('button[type="submit"]').click(),
  ]);
});

// One spec per page — fail in isolation, easier to diagnose.
const PAGES = [
  { path: '/',               heading: /dashboard/i,         expectTable: false },
  { path: '/customers',      heading: /customer management/i, expectTable: true  },
  { path: '/schemes',        heading: /scheme/i,             expectTable: true  },
  { path: '/scheme-members', heading: /fund scheme report/i, expectTable: true  },
  { path: '/payments',       heading: /payment/i,            expectTable: false },
  { path: '/auction',        heading: /auction/i,            expectTable: false },
  { path: '/transport',      heading: /transport/i,          expectTable: false },
  { path: '/tracking-order', heading: /tracking/i,           expectTable: false },
  { path: '/downloads',      heading: /download/i,           expectTable: false },
  { path: '/audit-logs',     heading: /audit log/i,          expectTable: true  },
];

for (const { path, heading, expectTable } of PAGES) {
  test(`page ${path} renders without console errors`, async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const responseErrors = [];
    page.on('response', (res) => {
      if (res.status() >= 500) responseErrors.push(`${res.status()} ${res.url()}`);
    });

    await page.goto(path);

    // Heading appears (basic render check)
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 15_000 });

    if (expectTable) {
      // Wait for at least one table row OR the empty-state text — proves data fetch finished
      await Promise.race([
        page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15_000 }),
        page.getByText(/no records found|no customers found|no data/i).first().waitFor({ state: 'visible', timeout: 15_000 }),
      ]);
    }

    // No 5xx errors during the page load
    expect(responseErrors, `5xx responses on ${path}: ${responseErrors.join(', ')}`).toHaveLength(0);

    // No unhandled JS errors (filter the noise: React DevTools nag, vite HMR)
    const real = consoleErrors.filter((e) =>
      !e.includes('Download the React DevTools') &&
      !e.includes('[vite]')
    );
    expect(real, `console errors on ${path}: ${real.join(' | ')}`).toHaveLength(0);
  });
}
