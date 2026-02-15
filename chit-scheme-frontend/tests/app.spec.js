import { test, expect } from '@playwright/test';

test.use({
  ignoreHTTPSErrors: true
});

test('End-to-End Application Flow', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Username' }).fill('admin');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin123');
  await page.getByRole('button', { name: 'Log In' }).click();
  
  // Wait for navigation
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Vasantham Crackers Worlds')).toBeVisible();

  // 2. Transport Master - Add Transporter
  await page.getByRole('menuitem', { name: 'Transport' }).click();
  await page.getByRole('button', { name: 'plus Add Transporter' }).click();
  await page.getByRole('textbox', { name: '* Transporter Name' }).fill('sam123');
  await page.getByRole('textbox', { name: 'Contact Person' }).fill('sam');
  await page.getByRole('textbox', { name: '* Phone Number' }).fill('96325897410');
  await page.getByRole('button', { name: 'OK' }).click();
  
  // 3. Transport Master - Add Branch/Delivery Point
  await page.getByRole('button', { name: 'View Details' }).first().click();
  await page.getByRole('textbox', { name: '* Branch Name' }).fill('vpm');
  await page.getByRole('textbox', { name: 'Branch Phone' }).fill('9874563210');
  await page.getByRole('textbox', { name: 'Branch Address' }).fill('villupuram');
  await page.getByRole('button', { name: 'plus Add Branch' }).click();
  
  await page.getByRole('textbox', { name: '* Branch Name' }).fill('coimbatore');
  await page.getByRole('textbox', { name: 'Branch Phone' }).fill('9871234765');
  await page.getByRole('textbox', { name: 'Branch Address' }).fill('coimbatore');
  await page.getByRole('button', { name: 'plus Add Branch' }).click();
  await page.getByRole('button', { name: 'Close' }).click();

  // 4. Schemes - Create Scheme
  await page.getByRole('menuitem', { name: 'Schemes', exact: true }).click();
  await page.getByRole('button', { name: '+ New Scheme' }).click();
  await page.getByRole('textbox', { name: '* Scheme Name' }).fill('samp5000');
  await page.getByRole('spinbutton', { name: '* Amount Per Month' }).fill('500000');
  await page.getByRole('spinbutton', { name: '* Period (Months)' }).fill('10');
  await page.getByRole('spinbutton', { name: 'Bonus Amount' }).fill('5698');
  
  // Start Month selection
  await page.getByRole('textbox', { name: 'Start Month' }).click();
  await page.getByRole('textbox', { name: 'Start Month' }).fill('01-02-2026');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'OK' }).click();

  // 5. Customers - Add Customer
  await page.getByRole('menuitem', { name: 'Customers' }).click();
  await page.getByRole('button', { name: 'plus Add Customer' }).click();
  await page.getByRole('textbox', { name: '* Customer Code' }).fill('SAMP1236');
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('ESWAR1');
  await page.getByRole('spinbutton', { name: '* Phone number' }).fill('9003568114');
  
  // Customer Type
  await page.getByRole('combobox', { name: 'Customer Type' }).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  
  await page.getByRole('textbox', { name: 'Address Line 1' }).fill('address1');
  await page.getByRole('textbox', { name: 'Address Line 2' }).fill('address2');
  
  // State selection
  await page.getByRole('combobox', { name: 'State' }).click();
  await page.getByRole('combobox', { name: 'State' }).fill('kar');
  await page.keyboard.press('Enter');
  
  // District selection
  await page.getByRole('combobox', { name: 'District' }).click();
  await page.getByRole('combobox', { name: 'District' }).fill('mys');
  await page.keyboard.press('Enter');
  
  await page.getByRole('spinbutton', { name: 'Pincode' }).fill('963258');
  await page.getByRole('textbox', { name: 'Ref Name' }).fill('komu');
  await page.getByRole('spinbutton', { name: 'Ref Phone' }).fill('9486540461');
  
  // Delivery point
  await page.getByRole('combobox', { name: 'Delivery point' }).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  
  // Select Scheme
  await page.getByRole('combobox', { name: 'Select Scheme' }).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  
  await page.getByRole('button', { name: 'OK' }).click();
  await page.getByRole('button', { name: 'No, Create Only' }).click();

  // 6. Dashboard Search
  await page.getByRole('menuitem', { name: 'Dashboard' }).click();
  await page.getByRole('searchbox', { name: 'Enter Customer Code or ID' }).fill('samp1236');
  await page.getByRole('searchbox', { name: 'Enter Customer Code or ID' }).press('Enter');
  await expect(page.getByText('ESWAR1')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).first().click();

  // 7. Payments
  await page.getByRole('menuitem', { name: 'Payments' }).click();
  await page.getByRole('searchbox', { name: 'Enter Fund Number (e.g.' }).fill('f2026/002');
  await page.getByRole('searchbox', { name: 'Enter Fund Number (e.g.' }).press('Enter');
  
  // Record Payment
  await page.getByRole('row', { name: '1 10-02-2026 ₹500000 ₹0 -' }).getByRole('button').click();
  await page.getByRole('spinbutton', { name: '* Amount Received' }).fill('500000');
  await page.getByRole('button', { name: 'Record Payment' }).click();
  await page.getByRole('button', { name: 'No, Pay Only' }).click();

  // 8. Tracking Order
  await page.getByRole('menuitem', { name: 'Tracking Order' }).click();
  await page.getByRole('button', { name: '+ New Order' }).click();
  await page.getByRole('textbox', { name: 'Order Number' }).fill('2263');
  await page.getByText('Unregistered / Guest Customer').click();
  await page.getByRole('textbox', { name: 'Enter Guest / Customer Name' }).fill('nalini');
  
  await page.getByRole('textbox', { name: 'Order Received Date' }).click();
  await page.getByRole('textbox', { name: 'Order Received Date' }).fill('01-01-2026');
  await page.keyboard.press('Enter');
  
  await page.getByRole('spinbutton', { name: 'Payment Amount' }).fill('1000');
  
  await page.locator('#rc_select_64').click(); // Transporter
  await page.getByText('sam123').click();
  
  await page.locator('#rc_select_65').click(); // Branch
  await page.getByText('vpm').nth(1).click();
  
  await page.getByRole('button', { name: 'OK' }).click();
  await page.getByRole('button', { name: 'No, Create Only' }).click();

  // 9. Downloads Preview
  await page.getByRole('menuitem', { name: 'Downloads' }).click();
  await page.getByRole('button', { name: 'eye Preview' }).click();
  await expect(page.locator('table')).toBeVisible();
});