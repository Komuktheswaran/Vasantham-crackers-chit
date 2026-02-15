import { test, expect } from '@playwright/test';

test.describe('Performance & Metadata Verification', () => {
  
  test('Login and Dashboard Performance Metrics', async ({ page }) => {
    // 1. Measure Login Latency
    const startLogin = Date.now();
    await page.goto('/login');
    await page.getByPlaceholder('Username').fill('admin');
    await page.getByPlaceholder('Password').fill('admin123');
    await page.getByRole('button', { name: 'Log In' }).click();
    
    await expect(page).toHaveURL(/\/$/); // Root dashboard
    await expect(page.getByText('Vasantham Crackers Worlds')).toBeVisible();
    const loginDuration = Date.now() - startLogin;
    console.log(`⏱️ Login to Dashboard Duration: ${loginDuration}ms`);

    // 2. Navigation Performance
    const metrics = await page.evaluate(async () => {
      const [navigation] = performance.getEntriesByType('navigation');
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd,
        loadEvent: navigation.loadEventEnd,
        tti: navigation.domInteractive, 
      };
    });
    console.log(`📊 Dashboard TTI: ${metrics.tti.toFixed(2)}ms`);
    console.log(`📊 Dashboard Load Event: ${metrics.loadEvent.toFixed(2)}ms`);

    // 3. API Response Timing (Simulated Interaction)
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/customers') && res.status() === 200),
      page.getByRole('menuitem', { name: 'Customers' }).click(),
    ]);
    const apiStartTime = await response.request().timing().startTime;
    const apiEndTime = await response.request().timing().responseEnd;
    console.log(`⏳ API /api/customers Response Time: ${(apiEndTime - apiStartTime).toFixed(2)}ms`);
  });

  test('Placeholder & Metadata Values Verification', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Username').fill('admin');
    await page.getByPlaceholder('Password').fill('admin123');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Verification of placeholders on Customer Page
    await page.getByRole('menuitem', { name: 'Customers' }).click();
    await page.getByRole('button', { name: 'plus Add Customer' }).click();

    const placeholders = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      return inputs.map(input => ({
        id: input.id || input.name || 'unnamed',
        placeholder: input.getAttribute('placeholder') || 'MISSING',
        type: input.tagName
      }));
    });

    const missingPlaceholders = placeholders.filter(p => p.placeholder === 'MISSING' && p.type === 'INPUT');
    if (missingPlaceholders.length > 0) {
      console.warn('⚠️ Missing Placeholders detected:', missingPlaceholders);
    } else {
      console.log('✅ All monitored inputs have placeholders.');
    }

    expect(placeholders.length).toBeGreaterThan(0);
  });

  test('Server Concurrency Stability (Parallel Requests)', async ({ context }) => {
    const API_HEALTH_URL = 'https://103.38.50.149:5006/api/health';
    // Fire multiple requests simultaneously to verify connection pooling stability
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage()
    ]);

    const requests = pages.map(p => p.goto(API_HEALTH_URL, { waitUntil: 'load' }).catch(e => e));
    const responses = await Promise.all(requests);
    
    for (const res of responses) {
      if (res instanceof Error) {
        console.error('Concurrency Request Failed:', res.message);
        throw res;
      }
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('OK');
    }
    console.log('🚀 Server handled 3 parallel health check requests successfully.');
  });
});
