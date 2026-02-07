const { test, expect } = require('@playwright/test');

test.describe('Application Connectivity and Spelling', () => {
    
  test('should load the login page and show correct title', async ({ page }) => {
    // 1. Visit the root URL
    await page.goto('/');

    // 2. Check if we are redirected to /login (since unauthenticated)
    // Note: The app redirects to /login if not authenticated
    await expect(page).toHaveURL(/.*login/);

    // 3. Verify the "Spelling" / Text content
    // Expect to see "Vasantham Crackers" or similar in the header or login form
    // Based on App.jsx: "Vasantham Crackers Worlds" (sic)
    await expect(page.getByRole('button', { name: /Vasantham Crackers Worlds/i })).toBeVisible();

    // 4. Verify Login Form Components Load
    await expect(page.getByPlaceholder(/username/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('should have backend connectivity (health check)', async ({ request }) => {
    // Directly check backend connectivity via API request from the test runner
    // Assuming backend is at localhost:5000 based on server.js
    const backendHealth = await request.get('http://localhost:5000/api/health');
    expect(backendHealth.ok()).toBeTruthy();
    
    const responseBody = await backendHealth.json();
    expect(responseBody).toHaveProperty('status', 'OK');
    expect(responseBody).toHaveProperty('db', 'Connected');
  });

});
