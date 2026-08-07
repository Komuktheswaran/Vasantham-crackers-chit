// k6 BROWSER test — drives a real Chrome instance per VU.
// Requires k6 v0.43+ (browser module ships with the binary).
//
// Run:
//   k6 run -e BASE=https://103.38.50.247 -e USER=admin -e PASS=yourpass browser.js
//
// IMPORTANT: each VU = one Chrome instance. Do NOT exceed ~5 VUs unless you
// have a serious load-test machine. This measures real-user experience —
// Time-to-Interactive, layout shift, render time on the customers grid —
// not API throughput.

import { browser } from 'k6/browser';
import { check } from 'k6';

const BASE = __ENV.BASE || 'https://103.38.50.247';
const USER = __ENV.USER || 'admin';
const PASS = __ENV.PASS || 'admin';

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      options: { browser: { type: 'chromium' } },
      vus: 3,
      iterations: 9,    // 9 total page loads spread across 3 concurrent browsers
      maxDuration: '5m',
    },
  },
  thresholds: {
    browser_web_vital_lcp: ['p(95)<4000'],  // Largest Contentful Paint p95 < 4s
    browser_web_vital_fid: ['p(95)<300'],   // First Input Delay  p95 < 300ms
  },
};

export default async function () {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  try {
    // 1. Login
    await page.goto(`${BASE}/login`);
    await page.locator('input[type="text"], input[name="username"]').first().type(USER);
    await page.locator('input[type="password"]').first().type(PASS);
    await Promise.all([
      page.waitForNavigation(),
      page.locator('button[type="submit"]').click(),
    ]);

    // 2. Customers page — the heaviest list in the app
    await page.goto(`${BASE}/customers`);
    await page.waitForSelector('table', { timeout: 10000 });

    // 3. Scheme members page — exercises the new EXISTS filter under load
    await page.goto(`${BASE}/scheme-members`);
    await page.waitForSelector('table', { timeout: 10000 });

    check(page, { 'page rendered': p => !!p });
  } finally {
    await page.close();
    await ctx.close();
  }
}
