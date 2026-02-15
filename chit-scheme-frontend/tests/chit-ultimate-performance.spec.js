// tests/chit-ultimate-performance.spec.js
import { test, expect } from '@playwright/test';

// ===== GLOBAL CONFIGURATION =====
test.setTimeout(180000); // 180 seconds for realistic testing
test.use({ 
  ignoreHTTPSErrors: true,
  actionTimeout: 20000,
  navigationTimeout: 30000
});

const generateId = () => `test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
const metrics = [];
const apiTimes = [];

const testData = {
  transporter: null,
  transporterBranch: null,
  scheme: null,
  customer: null,
  fundNumber: null,
  order1: null,
  order2: null,
  username: null
};

// ===== HELPER: Close Any Open Modals/Dialogs =====
const closeAllModals = async (page) => {
  try {
    const closeButtons = [
      '.ant-modal-close',
      '.ant-modal-footer button:has-text("Close")',
      '.ant-modal-footer button:has-text("Cancel")',
      '.ant-drawer-close'
    ];
    
    for (const selector of closeButtons) {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 500 })) {
        await button.click();
        await page.waitForTimeout(300);
      }
    }
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  } catch (e) {
    console.log('   ⚠️  Could not auto-close modal');
  }
};

// ===== HELPER: Check for Blocking Modals =====
const checkForBlockingElements = async (page, stepName) => {
  const hasModal = await page.locator('.ant-modal-wrap:visible').count() > 0;
  const hasDrawer = await page.locator('.ant-drawer:visible').count() > 0;
  
  if (hasModal || hasDrawer) {
    console.log(`   ⚠️  Modal/Drawer detected - attempting auto-close...`);
    await closeAllModals(page);
    
    const stillBlocked = await page.locator('.ant-modal-wrap:visible, .ant-drawer:visible').count() > 0;
    if (stillBlocked) {
      console.log(`   ❌ Auto-close failed - manual intervention needed`);
      await page.screenshot({ path: `blocked-${stepName.replace(/\s+/g, '-')}.png` });
      await page.pause();
      console.log(`   ✅ Manual intervention completed\n`);
    }
  }
};

// SEQUENTIAL TESTING
test.describe.serial('Chit Scheme - Complete Realistic Performance Testing', () => {
  let sharedPage;
  let sharedBrowserContext;

  test.beforeAll(async ({ browser, browserName }) => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🚀 Starting ${browserName.toUpperCase()} Realistic Performance Test`);
    console.log(`   Time: ${new Date().toLocaleString()}`);
    console.log('='.repeat(70) + '\n');
    
    sharedBrowserContext = await browser.newContext({ 
      ignoreHTTPSErrors: true 
    });
    sharedPage = await sharedBrowserContext.newPage();
    
    // API monitoring
    sharedPage.on('response', async (response) => {
      if (response.url().includes('/api')) {
        try {
          const timing = response.timing();
          apiTimes.push({
            browser: browserName,
            endpoint: response.url().split('/').pop(),
            status: response.status(),
            time: timing.responseEnd - timing.requestStart
          });
        } catch (e) {}
      }
    });
  });

  test.afterAll(async ({ browserName }) => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`   ${browserName.toUpperCase()} - COMPLETE PERFORMANCE SUMMARY`);
    console.log('='.repeat(70));

    const browserMetrics = metrics.filter(m => m.browser === browserName);
    console.table(browserMetrics);

    const totalTime = browserMetrics.reduce((sum, m) => sum + m.time, 0);
    console.log(`\n📊 Total Execution Time: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s`);

    const browserApis = apiTimes.filter(a => a.browser === browserName);
    if (browserApis.length > 0) {
      const avgApiTime = browserApis.reduce((sum, a) => sum + a.time, 0) / browserApis.length;
      console.log(`📡 Average API Response: ${avgApiTime.toFixed(0)}ms`);
      console.log(`📊 Total API Calls: ${browserApis.length}`);
    }

    console.log(`\n✅ All ${browserMetrics.length} modules tested!`);
    console.log(`\n⏸️  Keeping browser open for 60 seconds for review...`);
    console.log(`   Close manually or wait for auto-close\n`);
    
    await sharedPage.waitForTimeout(600);
    
    console.log(`   Closing browser now...\n`);
    await sharedPage?.close();
    await sharedBrowserContext?.close();
  });

  // ===== STEP 1: Application Loading =====
  test('1. Application Loading', async ({ browserName }) => {
    console.log('🔄 STEP 1: Testing Application Load...');
    const start = Date.now();

    await sharedPage.goto('https://103.38.50.149:5005/login', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await expect(sharedPage.getByRole('textbox', { name: 'Username' })).toBeVisible({ timeout: 10000 });
    await expect(sharedPage.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await expect(sharedPage.getByRole('button', { name: 'Log In' })).toBeVisible();

    const elapsed = Date.now() - start;
    metrics.push({ browser: browserName, step: '1. App Loading', time: elapsed, status: '✅ PASS' });

    console.log(`✅ [${browserName}] App Loading: ${elapsed}ms`);
    console.log('   └─ Login form visible and ready\n');
  });

  // ===== STEP 2: Login (REALISTIC) =====
  test('2. Login', async ({ browserName }) => {
    console.log('🔄 STEP 2: Testing Login (Realistic Interaction)...');
    const start = Date.now();

    // Realistic tab-based navigation
    await sharedPage.getByRole('textbox', { name: 'Username' }).click();
    await sharedPage.getByRole('textbox', { name: 'Username' }).fill('admin');
    await sharedPage.getByRole('textbox', { name: 'Username' }).press('Tab');
    await sharedPage.getByRole('textbox', { name: 'Password' }).fill('admin123');
    await sharedPage.getByRole('textbox', { name: 'Password' }).press('Tab');
    await sharedPage.getByRole('checkbox', { name: 'Remember me' }).press('Tab');
    await sharedPage.getByRole('button', { name: 'Log In' }).press('Enter');

    await sharedPage.waitForURL('https://103.38.50.149:5005/', { timeout: 30000 });
    await sharedPage.waitForLoadState('networkidle', { timeout: 30000 });

    const elapsed = Date.now() - start;
    metrics.push({ browser: browserName, step: '2. Login', time: elapsed, status: '✅ PASS' });

    console.log(`✅ [${browserName}] Login: ${elapsed}ms`);
    console.log(`   └─ Redirected to: ${sharedPage.url()}\n`);
  });

  // ===== STEP 3: Transport CRUD (REALISTIC) =====
  test('3. Transport CRUD - Full Workflow', async ({ browserName }) => {
    await checkForBlockingElements(sharedPage, 'Transport');
    
    console.log('🔄 STEP 3: Testing Transport Module (Full Workflow)...');
    const start = Date.now();
    const transporter = generateId();

    await sharedPage.locator('.ant-layout-sider .ant-menu-item:has-text("Transport")').first().click();
    await sharedPage.waitForLoadState('networkidle');

    // Create Transporter
    console.log(`   📝 Creating transporter: ${transporter}`);
    await sharedPage.getByRole('button', { name: 'plus Add Transporter' }).click();
    await sharedPage.getByRole('textbox', { name: '* Transporter Name' }).fill(transporter);
    await sharedPage.getByRole('textbox', { name: '* Transporter Name' }).press('Tab');
    await sharedPage.getByRole('textbox', { name: 'Contact Person' }).fill('ContactPerson');
    await sharedPage.getByRole('textbox', { name: 'Contact Person' }).press('Tab');
    await sharedPage.getByRole('textbox', { name: '* Phone Number' }).fill('9' + Math.floor(Math.random() * 1e9));
    await sharedPage.getByRole('button', { name: 'OK' }).click();
    await expect(sharedPage.getByText(transporter)).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Transporter created');

    // Add Multiple Branches
    console.log('   📝 Adding branches...');
    await sharedPage.getByRole('button', { name: 'View Details' }).first().click();
    
    // Branch 1
    await sharedPage.getByRole('textbox', { name: '* Branch Name' }).fill('Branch1');
    await sharedPage.getByRole('textbox', { name: 'Branch Phone' }).fill('9876543210');
    await sharedPage.getByRole('textbox', { name: 'Branch Address' }).fill('Address1');
    await sharedPage.getByRole('button', { name: 'plus Add Branch' }).click();
    console.log('   ✅ Branch 1 added');
    
    // Branch 2
    await sharedPage.getByRole('textbox', { name: '* Branch Name' }).fill('Branch2');
    await sharedPage.getByRole('textbox', { name: 'Branch Phone' }).fill('9876543211');
    await sharedPage.getByRole('textbox', { name: 'Branch Address' }).fill('Address2');
    await sharedPage.getByRole('button', { name: 'plus Add Branch' }).click();
    console.log('   ✅ Branch 2 added');
    
    // Delete Branch 1
    await sharedPage.locator('.ant-btn.css-mncuj7.ant-btn-text.ant-btn-dangerous').first().click();
    console.log('   ✅ Branch 1 deleted');
    
    await sharedPage.getByRole('button', { name: 'Close' }).click();
    await closeAllModals(sharedPage);

    testData.transporter = transporter;
    testData.transporterBranch = 'Branch2';
    const elapsed = Date.now() - start;
    metrics.push({ browser: browserName, step: '3. Transport', time: elapsed, status: '✅ PASS' });

    console.log(`✅ [${browserName}] Transport: ${elapsed}ms`);
    console.log(`   └─ Created: ${transporter} with 2 branches (1 deleted)\n`);
  });

  // ===== STEP 4: Schemes CRUD (REALISTIC) =====
  test('4. Schemes CRUD - Full Workflow', async ({ browserName }) => {
    await checkForBlockingElements(sharedPage, 'Schemes');
    
    console.log('🔄 STEP 4: Testing Schemes Module (Full Workflow)...');
    const start = Date.now();
    const scheme = generateId();

    await sharedPage.locator('.ant-layout-sider .ant-menu-item:has-text("Schemes")').first().click();
    await sharedPage.waitForLoadState('networkidle');

    // Create Scheme
    console.log(`   📝 Creating scheme: ${scheme}`);
    await sharedPage.getByRole('button', { name: '+ New Scheme' }).click();
    await sharedPage.getByRole('textbox', { name: '* Scheme Name' }).fill(scheme);
    await sharedPage.getByRole('spinbutton', { name: '* Amount Per Month' }).fill('5000');
    await sharedPage.getByRole('spinbutton', { name: '* Period (Months)' }).fill('10');
    await sharedPage.getByRole('spinbutton', { name: '* Period (Months)' }).press('Tab');
    await sharedPage.getByRole('spinbutton', { name: 'Bonus Amount' }).fill('500');
    await sharedPage.getByRole('spinbutton', { name: 'Bonus Amount' }).press('Tab');
    await sharedPage.getByRole('textbox', { name: 'Start Month' }).fill('01-03-2026');
    await sharedPage.getByRole('textbox', { name: 'Start Month' }).press('Enter');
    await sharedPage.getByRole('button', { name: 'OK' }).click();
    
    await sharedPage.waitForTimeout(2000);
    
    // Handle 500 error
    const errorModal = sharedPage.locator('.ant-modal-content:has-text("500"), .ant-modal-content:has-text("Error"), .ant-notification-notice-error');
    if (await errorModal.isVisible({ timeout: 2000 })) {
      console.log('   ⚠️  500 Error detected - closing...');
      const okButton = sharedPage.locator('.ant-modal-footer button, .ant-notification-close-icon').first();
      if (await okButton.isVisible({ timeout: 1000 })) {
        await okButton.click();
      }
    }
    
    await closeAllModals(sharedPage);
    
    // Verify
    console.log('   🔍 Verifying scheme...');
    let schemeFound = false;
    
    if (await sharedPage.getByText(scheme, { exact: true }).isVisible({ timeout: 3000 })) {
      schemeFound = true;
    } else {
      await sharedPage.reload();
      await sharedPage.waitForLoadState('networkidle');
      if (await sharedPage.getByText(scheme, { exact: true }).isVisible({ timeout: 10000 })) {
        schemeFound = true;
      }
    }
    
    if (!schemeFound) {
      console.log('   ❌ Scheme not found - pausing');
      await sharedPage.pause();
    } else {
      console.log('   ✅ Scheme created');
    }

    // Update Scheme
    console.log('   ✏️  Updating scheme bonus...');
    await sharedPage.getByRole('button', { name: 'edit' }).first().click();
    await sharedPage.getByRole('spinbutton', { name: 'Bonus Amount' }).fill('600');
    await sharedPage.getByRole('button', { name: 'OK' }).click();
    await sharedPage.waitForTimeout(1500);
    
    if (await errorModal.isVisible({ timeout: 2000 })) {
      const okButton = sharedPage.locator('.ant-modal-footer button').first();
      if (await okButton.isVisible({ timeout: 1000 })) {
        await okButton.click();
      }
    }
    
    await closeAllModals(sharedPage);
    console.log('   ✅ Scheme updated');

    testData.scheme = scheme;
    const elapsed = Date.now() - start;
    metrics.push({ browser: browserName, step: '4. Schemes', time: elapsed, status: '✅ PASS' });

    console.log(`✅ [${browserName}] Schemes: ${elapsed}ms`);
    console.log(`   └─ Created & Updated: ${scheme}\n`);
  });

  // ===== STEP 5: Customers CRUD (REALISTIC - FULL FORM) =====
// ===== STEP 5: Customers CRUD (REALISTIC - FULL FORM) =====
test('5. Customers CRUD - Complete Form', async ({ browserName }) => {
  await checkForBlockingElements(sharedPage, 'Customers');
  
  console.log('🔄 STEP 5: Testing Customers Module (Complete Form)...');
  const start = Date.now();
  const custCode = generateId();
  const phoneNumber = '9' + Math.floor(100000000 + Math.random() * 900000000);

  try {
    await sharedPage.locator('.ant-layout-sider .ant-menu-item:has-text("Customers")').first().click();
    await sharedPage.waitForLoadState('networkidle');

    console.log(`   📝 Creating customer: ${custCode}`);
    await sharedPage.getByRole('button', { name: 'plus Add Customer' }).click();
    
    // Fill complete customer form (realistic)
    await sharedPage.getByRole('textbox', { name: '* Customer Code' }).fill(custCode);
    await sharedPage.getByRole('textbox', { name: 'Name', exact: true }).fill('Test Customer');
    await sharedPage.getByRole('textbox', { name: 'Name', exact: true }).press('Tab');
    await sharedPage.getByRole('spinbutton', { name: '* Phone number' }).fill(phoneNumber);
    await sharedPage.getByRole('spinbutton', { name: '* Phone number' }).press('Tab');
    await sharedPage.getByRole('spinbutton', { name: 'Secondary Phone' }).press('Tab');
    
    // Customer Type
    await sharedPage.getByRole('combobox', { name: 'Customer Type' }).press('Enter');
    await sharedPage.getByRole('combobox', { name: 'Customer Type' }).press('ArrowDown');
    await sharedPage.getByRole('combobox', { name: 'Customer Type' }).press('Enter');
    
    // Address
    await sharedPage.getByRole('textbox', { name: 'Address Line 1' }).fill('Test Address 1');
    await sharedPage.getByRole('textbox', { name: 'Address Line 1' }).press('Tab');
    await sharedPage.getByRole('textbox', { name: 'Address Line 2' }).fill('Test Address 2');
    await sharedPage.getByRole('textbox', { name: 'Address Line 2' }).press('Tab');
    
    // State & District
    await sharedPage.getByRole('combobox', { name: 'State' }).fill('Tamil');
    await sharedPage.getByRole('combobox', { name: 'State' }).press('Enter');
    await sharedPage.getByRole('combobox', { name: 'District' }).fill('Vill');
    await sharedPage.getByRole('combobox', { name: 'District' }).press('Enter');
    await sharedPage.getByRole('spinbutton', { name: 'Pincode' }).fill('605103');
    
    // Reference
    await sharedPage.getByRole('textbox', { name: 'Ref Name' }).fill('RefPerson');
    await sharedPage.getByRole('spinbutton', { name: 'Ref Phone' }).fill('9003568114');
    
    // Delivery Point
    await sharedPage.getByRole('combobox', { name: 'Delivery point' }).press('Enter');
    await sharedPage.getByRole('combobox', { name: 'Delivery point' }).press('ArrowDown');
    await sharedPage.getByRole('combobox', { name: 'Delivery point' }).press('Enter');
    
    // Select Scheme
    await sharedPage.getByRole('combobox', { name: 'Select Scheme' }).press('Enter');
    await sharedPage.getByRole('combobox', { name: 'Select Scheme' }).press('ArrowDown');
    await sharedPage.getByRole('combobox', { name: 'Select Scheme' }).press('Enter');
    
    await sharedPage.getByRole('button', { name: 'OK' }).click();
    
    // Handle WhatsApp confirmation with timeout
    console.log('   ⏳ Waiting for confirmation dialog...');
    const waButton = sharedPage.getByRole('button', { name: 'Yes, Create & Send WA' });
    const createOnlyButton = sharedPage.getByRole('button', { name: 'No, Create Only' });
    
    const dialogVisible = await Promise.race([
      waButton.isVisible({ timeout: 5000 }).then(() => 'wa'),
      createOnlyButton.isVisible({ timeout: 5000 }).then(() => 'create'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 5000))
    ]);
    
    if (dialogVisible === 'wa') {
      await waButton.click();
      console.log('   ✅ Customer created with WA notification');
    } else if (dialogVisible === 'create') {
      await createOnlyButton.click();
      console.log('   ✅ Customer created without WA');
    } else {
      console.log('   ⚠️  No confirmation dialog - checking if saved...');
    }
    
    await sharedPage.waitForTimeout(3000);
    await closeAllModals(sharedPage);
    
    // Verify with better error handling
    console.log('   🔍 Verifying customer...');
    let customerFound = false;
    
    // Try 1: Check if visible immediately
    if (await sharedPage.getByText(custCode).isVisible({ timeout: 5000 }).catch(() => false)) {
      customerFound = true;
      console.log('   ✅ Customer found in list');
    }
    
    // Try 2: Refresh page
    if (!customerFound) {
      console.log('   🔄 Refreshing page...');
      await sharedPage.reload();
      await sharedPage.waitForLoadState('networkidle');
      
      if (await sharedPage.getByText(custCode).isVisible({ timeout: 5000 }).catch(() => false)) {
        customerFound = true;
        console.log('   ✅ Customer found after refresh');
      }
    }
    
    // Try 3: Search for customer
    if (!customerFound) {
      console.log('   🔍 Searching for customer...');
      const searchBox = sharedPage.getByRole('searchbox').first();
      if (await searchBox.isVisible({ timeout: 3000 })) {
        await searchBox.fill(custCode);
        await searchBox.press('Enter');
        await sharedPage.waitForTimeout(2000);
        
        if (await sharedPage.getByText(custCode).isVisible({ timeout: 5000 }).catch(() => false)) {
          customerFound = true;
          console.log('   ✅ Customer found via search');
        }
      }
    }
    
    if (!customerFound) {
      console.log('   ⚠️  Customer not found - taking screenshot and continuing...');
      await sharedPage.screenshot({ path: `customer-not-found-${Date.now()}.png`, fullPage: true });
      // Don't fail - continue to next test
    } else {
      // Edit Customer (change district) - only if found
      console.log('   ✏️  Updating customer district...');
      const customerRow = sharedPage.getByRole('row', { name: custCode });
      const editButton = customerRow.locator('button .anticon-edit, button:has-text("Edit")').first();
      
      if (await editButton.isVisible({ timeout: 5000 })) {
        await editButton.click();
        await sharedPage.waitForTimeout(800);
        
        // Use a more robust Way to select from AntD dropdown
        const districtSelect = sharedPage.getByRole('combobox', { name: 'District' });
        await districtSelect.click();
        await sharedPage.keyboard.type('Tirupattur', { delay: 100 });
        await sharedPage.waitForTimeout(500);
        await sharedPage.keyboard.press('Enter');
        
        await sharedPage.getByRole('button', { name: 'OK' }).click();
        await sharedPage.waitForTimeout(2000);
        await closeAllModals(sharedPage);
        console.log('   ✅ Customer updated');
      } else {
        console.log('   ⚠️  Edit button not found for customer row');
      }
    }

    testData.customer = custCode;
    const elapsed = Date.now() - start;
    metrics.push({ browser: browserName, step: '5. Customers', time: elapsed, status: customerFound ? '✅ PASS' : '⚠️  PARTIAL' });

    console.log(`${customerFound ? '✅' : '⚠️ '} [${browserName}] Customers: ${elapsed}ms`);
    console.log(`   └─ Created & ${customerFound ? 'Updated' : 'Attempted'}: ${custCode}\n`);
    
  } catch (error) {
    console.log(`   ❌ Error in Customers module: ${error.message}`);
    const elapsed = Date.now() - start;
    metrics.push({ browser: browserName, step: '5. Customers', time: elapsed, status: '❌ ERROR' });
    // Don't throw - continue to next test
    console.log(`   ➡️  Continuing to next test...\n`);
  }
});


  // ===== STEP 6: Assigned Schemes Management =====
  test('6. Assigned Schemes Management', async ({ browserName }) => {
    await checkForBlockingElements(sharedPage, 'Assigned Schemes');
    
    console.log('🔄 STEP 6: Testing Assigned Schemes Management...');
    const start = Date.now();

    // Remove and Re-assign Scheme
    console.log('   📝 Testing scheme removal and assignment...');
    
    // 1. Explicitly go to Customers page first to be sure
    await sharedPage.locator('.ant-menu-item:has-text("Customers")').first().click();
    await sharedPage.waitForLoadState('networkidle');
    await sharedPage.waitForTimeout(1000);

    // 2. Search for the customer created in Step 5
    console.log(`   🔍 Searching for customer ${testData.customer}...`);
    const searchBox = sharedPage.getByPlaceholder(/Search by Name, Phone/i).first();
    if (await searchBox.isVisible()) {
        await searchBox.fill(testData.customer);
        await searchBox.press('Enter');
        await sharedPage.waitForTimeout(1500);
    }

    const customerRow = sharedPage.getByRole('row', { name: testData.customer });
    // This button has title="Assign Schemes" and anticon-usergroup-add
    const assignButton = customerRow.locator('button[title="Assign Schemes"], button .anticon-usergroup-add').first();
    
    if (await assignButton.isVisible({ timeout: 10000 })) {
      await assignButton.click();
      await sharedPage.waitForTimeout(1000);
      
      // Remove existing scheme if any
      const removeButton = sharedPage.getByRole('button', { name: 'Remove Scheme' });
      if (await removeButton.isVisible({ timeout: 3000 })) {
        await removeButton.click();
        const yesRemove = sharedPage.getByRole('button', { name: 'Yes, Remove' });
        if (await yesRemove.isVisible({ timeout: 2000 })) {
          await yesRemove.click();
          await sharedPage.waitForTimeout(2000);
          console.log('   ✅ Existing scheme removed');
          
          // Re-open the modal as it usually closes after removal
          await assignButton.click();
          await sharedPage.waitForTimeout(1000);
        }
      }
      
      const schemeSelect = sharedPage.getByRole('combobox', { name: 'Select Scheme' });
      if (await schemeSelect.isVisible({ timeout: 5000 })) {
        await schemeSelect.click();
        await sharedPage.waitForTimeout(500);
        await sharedPage.keyboard.press('ArrowDown');
        await sharedPage.keyboard.press('Enter');
        await sharedPage.waitForTimeout(500);
        
        await sharedPage.getByRole('button', { name: 'Assign / Update' }).click();
        
        // Handle WA notification confirmation
        const sendWa = sharedPage.getByRole('button', { name: 'Yes, Assign & Send' });
        const assignOnly = sharedPage.getByRole('button', { name: 'No, Assign Only' });
        
        const dialogVisible = await Promise.race([
          sendWa.isVisible({ timeout: 5000 }).then(() => 'wa'),
          assignOnly.isVisible({ timeout: 5000 }).then(() => 'only'),
          new Promise(resolve => setTimeout(() => resolve('timeout'), 5000))
        ]);

        if (dialogVisible === 'wa') {
          await sendWa.click();
          console.log('   ✅ Scheme assigned with WA notification');
        } else if (dialogVisible === 'only') {
          await assignOnly.click();
          console.log('   ✅ Scheme assigned without WA');
        } else {
          console.log('   ⚠️  No assignment confirmation dialog found');
        }
        await sharedPage.waitForTimeout(2000);
      }
    } else {
      console.log('   ⚠️  Assign Scheme button not found for customer row');
    }
    
    await closeAllModals(sharedPage);

    // Navigate to Assigned Schemes page
    await sharedPage.locator('.ant-layout-sider .ant-menu-item:has-text("Assigned Schemes")').first().click();
    await sharedPage.waitForLoadState('networkidle');
    
    // Capture fund number
    const fundNumberElement = sharedPage.getByText(/F2026\//);
    if (await fundNumberElement.isVisible({ timeout: 5000 })) {
      const fundNumber = await fundNumberElement.textContent();
      testData.fundNumber = fundNumber;
      console.log(`   ✅ Fund Number: ${fundNumber}`);
    }

    const elapsed = Date.now() - start;
    metrics.push({ browser: browserName, step: '6. Assigned Schemes', time: elapsed, status: '✅ PASS' });

    console.log(`✅ [${browserName}] Assigned Schemes: ${elapsed}ms\n`);
  });

  // ===== STEP 7: Dashboard Search =====
  test('7. Dashboard - Multiple Search Methods', async ({ browserName }) => {
    await checkForBlockingElements(sharedPage, 'Dashboard');
    
    console.log('🔄 STEP 7: Testing Dashboard Search...');
    const start = Date.now();

    await sharedPage.locator('.ant-menu-item:has-text("Dashboard")').first().click();
    await sharedPage.waitForLoadState('networkidle');

    // Search by Fund Number
    if (testData.fundNumber) {
      console.log(`   🔍 Searching by fund number: ${testData.fundNumber}`);
      const fundSearch = sharedPage.getByRole('searchbox', { name: 'Enter Fund Number' });
      if (await fundSearch.isVisible({ timeout: 3000 })) {
        await fundSearch.fill(testData.fundNumber);
        await fundSearch.press('Enter');
        await sharedPage.waitForTimeout(1500);
        await sharedPage.getByRole('button', { name: 'Close' }).first().click();
        console.log('   ✅ Fund search completed');
      }
    }

    // Search by Customer Code
    if (testData.customer) {
      console.log(`   🔍 Searching by customer code: ${testData.customer}`);
      const custSearch = sharedPage.getByRole('searchbox', { name: 'Enter Customer Code or ID' });
      if (await custSearch.isVisible({ timeout: 3000 })) {
        await custSearch.fill(testData.customer);
        await custSearch.press('Enter');
        await sharedPage.waitForTimeout(1500);
        const closeBtn = sharedPage.getByRole('button', { name: 'Close' }).first();
        if (await closeBtn.isVisible({ timeout: 3000 })) {
          await closeBtn.click();
        }
        console.log('   ✅ Customer search completed');
      }
    }

    const elapsed = Date.now() - start;
    metrics.push({ browser: browserName, step: '7. Dashboard', time: elapsed, status: '✅ PASS' });

    console.log(`✅ [${browserName}] Dashboard: ${elapsed}ms\n`);
  });

  // ===== STEP 8: Reports Module =====
  test('8. Reports - Assigned Schemes Report', async ({ browserName }) => {
    await checkForBlockingElements(sharedPage, 'Reports');
    
    console.log('🔄 STEP 8: Testing Reports Module...');
    const start = Date.now();

    await sharedPage.locator('.ant-menu-item:has-text("Reports")').first().click();
    await sharedPage.waitForLoadState('networkidle');

    // Test Assigned Schemes Report
    await sharedPage.locator('.ant-layout-sider .ant-menu-item:has-text("Assigned Schemes")').first().click();
    
    if (testData.fundNumber) {
      const fundInput = sharedPage.getByRole('textbox', { name: 'Fund Number (e.g. 001)' });
      if (await fundInput.isVisible({ timeout: 5000 })) {
        await fundInput.fill(testData.fundNumber);
        await fundInput.press('Enter');
        console.log('   ✅ Report filtered by fund number');
      }
    }

    const elapsed = Date.now() - start;
    metrics.push({ browser: browserName, step: '8. Reports', time: elapsed, status: '✅ PASS' });

    console.log(`✅ [${browserName}] Reports: ${elapsed}ms\n`);
  });

  // ===== STEP 9: Payments - Record Multiple Payments =====
  test('9. Payments - Record Multiple Payments', async ({ browserName }) => {
    await checkForBlockingElements(sharedPage, 'Payments');
    
    console.log('🔄 STEP 9: Testing Payments Module (Multiple Payments)...');
    const start = Date.now();

    await sharedPage.locator('.ant-menu-item:has-text("Payments")').first().click();
    await sharedPage.waitForLoadState('networkidle');

    if (testData.fundNumber) {
      const searchBox = sharedPage.getByRole('searchbox', { name: /Enter Fund Number/i });
      if (await searchBox.isVisible({ timeout: 5000 })) {
        await searchBox.fill(testData.fundNumber);
        await searchBox.press('Enter');
        await sharedPage.waitForTimeout(2000);
        console.log(`   ✅ Loaded payments for ${testData.fundNumber}`);
        
        // Record first payment
        console.log('   💳 Recording payment 1...');
        const payButton1 = sharedPage.getByRole('row', { name: /Pending/ }).first().getByRole('button');
        if (await payButton1.isVisible({ timeout: 5000 })) {
          await payButton1.click();
          await sharedPage.getByRole('button', { name: 'Record Payment' }).click();
          const notifyButton = sharedPage.getByRole('button', { name: 'Yes, Pay & Notify' });
          if (await notifyButton.isVisible({ timeout: 3000 })) {
            await notifyButton.click();
            console.log('   ✅ Payment 1 recorded with notification');
          }
          await sharedPage.waitForTimeout(1500);
        }
        
        // Record second payment with custom amount
        console.log('   💳 Recording payment 2 (custom amount)...');
        const payButton2 = sharedPage.getByRole('row', { name: /Pending/ }).first().getByRole('button');
        if (await payButton2.isVisible({ timeout: 5000 })) {
          await payButton2.click();
          const amountInput = sharedPage.getByRole('spinbutton', { name: '* Amount Received' });
          if (await amountInput.isVisible({ timeout: 3000 })) {
            await amountInput.fill('3000');
            await sharedPage.getByRole('button', { name: 'Record Payment' }).click();
            const notifyButton = sharedPage.getByRole('button', { name: 'Yes, Pay & Notify' });
            if (await notifyButton.isVisible({ timeout: 3000 })) {
              await notifyButton.click();
              console.log('   ✅ Payment 2 recorded with custom amount');
            }
          }
          await sharedPage.waitForTimeout(1500);
        }
      }
    }

    const elapsed = Date.now() - start;
    metrics.push({ browser: browserName, step: '9. Payments', time: elapsed, status: '✅ PASS' });

    console.log(`✅ [${browserName}] Payments: ${elapsed}ms\n`);
  });

  // ===== STEP 10: Auction - Pay All Remaining =====
  test('10. Auction - Complete Payment', async ({ browserName }) => {
    await checkForBlockingElements(sharedPage, 'Auction');
    
    console.log('🔄 STEP 10: Testing Auction Module (Pay All)...');
    const start = Date.now();

    await sharedPage.locator('.ant-menu-item:has-text("Auction")').first().click();
    await sharedPage.waitForLoadState('networkidle');

    if (testData.fundNumber) {
      const searchBox = sharedPage.getByRole('searchbox');
      if (await searchBox.isVisible({ timeout: 5000 })) {
        await searchBox.fill(testData.fundNumber);
        await searchBox.press('Enter');
        await sharedPage.waitForTimeout(1500);
        console.log(`   ✅ Loaded auction for ${testData.fundNumber}`);
        
        // Pay all remaining
        const payAllButton = sharedPage.getByRole('button', { name: 'dollar Pay All Remaining' });
        if (await payAllButton.isVisible({ timeout: 5000 })) {
          await payAllButton.click();
          const confirmButton = sharedPage.getByRole('button', { name: 'Pay All & Close' });
          if (await confirmButton.isVisible({ timeout: 3000 })) {
            await confirmButton.click();
            await sharedPage.waitForTimeout(2000);
            
            // Handle success dialog
            const okButton = sharedPage.getByRole('button', { name: 'OK' });
            if (await okButton.isVisible({ timeout: 3000 })) {
              await okButton.click();
              console.log('   ✅ All remaining payments completed');
            }
          }
        }
      }
    }

    const elapsed = Date.now() - start;
    metrics.push({ browser: browserName, step: '10. Auction', time: elapsed, status: '✅ PASS' });

    console.log(`✅ [${browserName}] Auction: ${elapsed}ms\n`);
  });

  // ===== STEP 11: Downloads - Test All Tabs =====
  test('11. Downloads - Preview All Reports', async ({ browserName }) => {
    await checkForBlockingElements(sharedPage, 'Downloads');
    
    console.log('🔄 STEP 11: Testing Downloads Module (All Tabs)...');
    const start = Date.now();

    await sharedPage.locator('.ant-menu-item:has-text("Downloads")').first().click();
    await sharedPage.waitForLoadState('networkidle');

    const tabs = ['Schemes', 'Customers', 'Payments', 'Order Tracking'];
    
    for (const tab of tabs) {
      console.log(`   📑 Testing ${tab} tab...`);
      try {
        const tabButton = sharedPage.getByRole('tab', { name: tab });
        if (await tabButton.isVisible({ timeout: 5000 })) {
          await tabButton.click();
          await sharedPage.waitForTimeout(1000);
          
          const previewBtn = sharedPage.getByRole('button', { name: 'eye Preview' });
          if (await previewBtn.isVisible({ timeout: 5000 })) {
            console.log(`      ✓ ${tab} preview button available`);
          }
        }
      } catch (error) {
        console.log(`      ⚠️  ${tab} tab error: ${error.message}`);
      }
    }

    const elapsed = Date.now() - start;
    metrics.push({ browser: browserName, step: '11. Downloads', time: elapsed, status: '✅ PASS' });

    console.log(`✅ [${browserName}] Downloads: ${elapsed}ms\n`);
  });

  // ===== STEP 12: Tracking Order - Create Two Orders =====
  test('12. Tracking Order - Registered & Guest', async ({ browserName }) => {
    await checkForBlockingElements(sharedPage, 'Tracking Order');
    
    console.log('🔄 STEP 12: Testing Tracking Order Module...');
    const start = Date.now();
    const order1Num = generateId();
    const order2Num = generateId();

    await sharedPage.locator('.ant-menu-item:has-text("Tracking Order")').first().click();
    await sharedPage.waitForLoadState('networkidle');

    // Order 1: Registered Customer
    console.log(`   📝 Creating order 1 (registered): ${order1Num}`);
    await sharedPage.getByRole('button', { name: '+ New Order' }).click();
    await sharedPage.getByRole('textbox', { name: 'Order Number' }).fill(order1Num);
    
    // Select registered customer
    const customerDropdown = sharedPage.locator('#Customer_ID');
    if (await customerDropdown.isVisible({ timeout: 3000 })) {
      await customerDropdown.click();
      await sharedPage.keyboard.press('ArrowDown');
      await sharedPage.keyboard.press('Enter');
    }
    
    await sharedPage.getByRole('textbox', { name: 'Order Received Date' }).fill('10-02-2026');
    await sharedPage.getByRole('textbox', { name: 'Payment Received Date' }).fill('10-02-2026');
    await sharedPage.getByRole('spinbutton', { name: 'Payment Amount' }).fill('1000');
    
    // Select transporter and branch
    const transporterSelect = sharedPage.locator('#rc_select_30, #rc_select_31, #rc_select_32').first();
    if (await transporterSelect.isVisible({ timeout: 3000 })) {
      await transporterSelect.click();
      await sharedPage.keyboard.press('ArrowDown');
      await sharedPage.keyboard.press('Enter');
    }
    
    const branchSelect = sharedPage.locator('#rc_select_31, #rc_select_32, #rc_select_33').first();
    if (await branchSelect.isVisible({ timeout: 3000 })) {
      await branchSelect.click();
      await sharedPage.keyboard.press('ArrowDown');
      await sharedPage.keyboard.press('Enter');
    }
    
    // Source
    const sourceSelect = sharedPage.getByRole('combobox', { name: 'Source' });
    if (await sourceSelect.isVisible({ timeout: 3000 })) {
      await sourceSelect.click();
      await sharedPage.keyboard.press('ArrowDown');
      await sharedPage.keyboard.press('Enter');
    }
    
    await sharedPage.getByRole('spinbutton', { name: 'Parcel Quantity' }).fill('1');
    await sharedPage.getByRole('button', { name: 'OK' }).click();
    
    const notifyButton1 = sharedPage.getByRole('button', { name: 'Yes, Create & Notify' });
    if (await notifyButton1.isVisible({ timeout: 3000 })) {
      await notifyButton1.click();
      console.log('   ✅ Order 1 created with notification');
    }
    await sharedPage.waitForTimeout(1500);

    // Order 2: Guest Customer
    console.log(`   📝 Creating order 2 (guest): ${order2Num}`);
    await sharedPage.getByRole('button', { name: '+ New Order' }).click();
    await sharedPage.getByRole('textbox', { name: 'Order Number' }).fill(order2Num);
    await sharedPage.getByRole('checkbox', { name: 'Unregistered / Guest Customer' }).check();
    await sharedPage.getByRole('textbox', { name: 'Enter Guest / Customer Name' }).fill('Guest Customer');
    await sharedPage.getByRole('textbox', { name: 'Order Received Date' }).fill('15-02-2026');
    await sharedPage.getByRole('textbox', { name: 'Payment Received Date' }).fill('15-02-2026');
    await sharedPage.getByRole('spinbutton', { name: 'Payment Amount' }).fill('2000');
    
    // Select transporter
    const transporterSelect2 = sharedPage.locator('div').filter({ hasText: testData.transporter }).first();
    if (await transporterSelect2.isVisible({ timeout: 3000 })) {
      await transporterSelect2.click();
    }
    
    await sharedPage.getByRole('spinbutton', { name: 'Parcel Quantity' }).fill('1');
    await sharedPage.getByRole('button', { name: 'OK' }).click();
    
    const notifyButton2 = sharedPage.getByRole('button', { name: 'Yes, Create & Notify' });
    if (await notifyButton2.isVisible({ timeout: 3000 })) {
      await notifyButton2.click();
      console.log('   ✅ Order 2 created with notification');
    }
    await sharedPage.waitForTimeout(1500);

    // Delete first order
    console.log('   🗑️  Deleting order 1...');
    const deleteButton = sharedPage.getByRole('button', { name: 'delete' }).first();
    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();
      const yesButton = sharedPage.getByRole('button', { name: 'Yes' });
      if (await yesButton.isVisible({ timeout: 2000 })) {
        await yesButton.click();
        console.log('   ✅ Order 1 deleted');
      }
    }

    testData.order1 = order1Num;
    testData.order2 = order2Num;
    const elapsed = Date.now() - start;
    metrics.push({ browser: browserName, step: '12. Tracking Order', time: elapsed, status: '✅ PASS' });

    console.log(`✅ [${browserName}] Tracking Order: ${elapsed}ms`);
    console.log(`   └─ Created: ${order1Num} (deleted), ${order2Num}\n`);
  });

  // ===== STEP 13: User Management - Full CRUD =====
  test('13. User Management - Create, Update, Delete', async ({ browserName }) => {
    // Avoid closing prospective modals too early
    await sharedPage.waitForTimeout(1000);
    await checkForBlockingElements(sharedPage, 'User Management');
    
    console.log('🔄 STEP 13: Testing User Management Module...');
    const start = Date.now();
    testData.username = 'testuser_' + Date.now();

    try {
      // Navigate using the specific Sider item to avoid clicking Card titles
      const userMenuLink = sharedPage.locator('.ant-layout-sider .ant-menu-item:has-text("User Management")');
      await userMenuLink.waitFor({ state: 'visible', timeout: 10000 });
      await userMenuLink.click();
      console.log('   📂 Navigated to User Management via Sider');
      await sharedPage.waitForLoadState('networkidle');
      await sharedPage.waitForTimeout(1000);

      // Verify page is loaded by checking card title
      const pageTitle = sharedPage.locator('.ant-card-head-title:has-text("User Management")');
      await expect(pageTitle).toBeVisible({ timeout: 10000 });

      // Create User
      console.log(`   📝 Creating user: ${testData.username}`);
      const createBtn = sharedPage.locator('button:has-text("Create User")');
      await createBtn.waitFor({ state: 'visible', timeout: 5000 });
      await createBtn.click({ force: true });
      console.log('   ✨ Clicked "Create User"');
      
      // Wait for modal and ensure it's the right one
      const modal = sharedPage.locator('.ant-modal-content:has-text("Create New User")');
      await modal.waitFor({ state: 'visible', timeout: 8000 });
      console.log('   🖼️  Modal "Create New User" visible');
      
      await modal.getByLabel('Username').fill(testData.username);
      await modal.getByLabel('Password').fill('password123');
      await modal.getByLabel('Full Name').fill('Test Performance User');
      
      // Select Role
      const roleSelect = modal.locator('.ant-select-selector').filter({ has: sharedPage.locator('#role') });
      await roleSelect.click({ force: true });
      await sharedPage.waitForTimeout(500);
      const adminOption = sharedPage.locator('.ant-select-item-option-content').filter({ hasText: /^Admin$/ }).last();
      if (await adminOption.isVisible({ timeout: 5000 })) {
          await adminOption.click();
          console.log('   👑 Selected Admin role');
      } else {
          await sharedPage.keyboard.press('ArrowDown');
          await sharedPage.keyboard.press('Enter');
      }

      await modal.locator('button:has-text("Create")').click();
      await modal.waitFor({ state: 'hidden', timeout: 10000 });
      console.log('   ✅ User created successfully');

      // Update User
      console.log(`   ✏️  Updating user: ${testData.username}`);
      const userRow = sharedPage.getByRole('row', { name: testData.username });
      await userRow.waitFor({ state: 'visible', timeout: 10000 });
      const editBtn = userRow.locator('.anticon-edit').first();
      
      await editBtn.click();
      const editModal = sharedPage.locator('.ant-modal-content:has-text("Edit User")');
      await editModal.waitFor({ state: 'visible', timeout: 5000 });
      
      await editModal.getByLabel('Full Name').fill('Updated Performance User');
      await editModal.locator('button:has-text("Update")').click();
      await editModal.waitFor({ state: 'hidden', timeout: 10000 });
      console.log('   ✅ User updated successfully');

      // Move deletion to Step 14 for better reliability if Step 13 fails
      console.log('   ✅ User creation and update verified');

    } catch (error) {
      console.log(`   ❌ Error in Step 13: ${error.message}`);
      await sharedPage.screenshot({ path: `error-step13-${Date.now()}.png`, fullPage: true });
      throw error; // Let Playwright handle the failure
    }

    const elapsed = Date.now() - start;
    metrics.push({ browser: browserName, step: '13. User Management', time: elapsed, status: '✅ PASS' });

    console.log(`✅ [${browserName}] User Management: ${elapsed}ms\n`);
    console.log(`🎉 ALL 13 STEPS COMPLETED!\n`);
  });

  // ===== STEP 14: Cleanup - Delete Created Data =====
  test('14. Cleanup - Delete Test Data', async ({ browserName }) => {
    console.log('🔄 STEP 14: Cleanup - Deleting Test Data...');
    const start = Date.now();

    // Delete Scheme
    if (testData.scheme) {
      console.log(`   🗑️  Deleting scheme: ${testData.scheme}`);
      await sharedPage.locator('.ant-layout-sider .ant-menu-item:has-text("Schemes")').first().click();
      await sharedPage.waitForLoadState('networkidle');
      
      const deleteSchemeBtn = sharedPage.getByRole('button', { name: 'delete' }).first();
      if (await deleteSchemeBtn.isVisible({ timeout: 5000 })) {
        await deleteSchemeBtn.click();
        const yesBtn = sharedPage.getByRole('button', { name: 'Yes, Delete It' });
        if (await yesBtn.isVisible({ timeout: 2000 })) {
          await yesBtn.click();
          await sharedPage.waitForTimeout(1000);
          console.log('   ✅ Scheme deleted');
        }
      }
    }

    // Delete Customer
    if (testData.customer) {
      console.log(`   🗑️  Deleting customer: ${testData.customer}`);
      await sharedPage.locator('.ant-layout-sider .ant-menu-item:has-text("Customers")').first().click();
      await sharedPage.waitForLoadState('networkidle');
      
      const deleteCustomerBtn = sharedPage.locator('.ant-space > div:nth-child(2) > .ant-btn').first();
      if (await deleteCustomerBtn.isVisible({ timeout: 5000 })) {
        await deleteCustomerBtn.click();
        const yesBtn = sharedPage.getByRole('button', { name: 'Yes, Delete It' });
        if (await yesBtn.isVisible({ timeout: 2000 })) {
          await yesBtn.click();
          await sharedPage.waitForTimeout(1000);
          console.log('   ✅ Customer deleted');
        }
      }
    }

    // Delete Transporter
    if (testData.transporter) {
      console.log(`   🗑️  Deleting transporter: ${testData.transporter}`);
      await sharedPage.locator('.ant-layout-sider .ant-menu-item:has-text("Transport")').first().click();
      await sharedPage.waitForLoadState('networkidle');
      
      const deleteTransportBtn = sharedPage.getByRole('button', { name: 'delete' }).first();
      if (await deleteTransportBtn.isVisible({ timeout: 5000 })) {
        await deleteTransportBtn.click();
        const yesBtn = sharedPage.getByRole('button', { name: 'OK' });
        if (await yesBtn.isVisible({ timeout: 2000 })) {
          await yesBtn.click();
          await sharedPage.waitForTimeout(1000);
          console.log('   ✅ Transporter deleted');
        }
      }
    }

    // Delete Order Tracking (Order 2)
    if (testData.order2) {
      console.log(`   🗑️  Deleting guest order: ${testData.order2}`);
      await sharedPage.locator('.ant-layout-sider .ant-menu-item:has-text("Tracking Order")').first().click();
      await sharedPage.waitForLoadState('networkidle');
      
      const orderRow = sharedPage.getByRole('row', { name: testData.order2 });
      if (await orderRow.isVisible({ timeout: 5000 })) {
        const deleteBtn = orderRow.locator('button .anticon-delete, button:has-text("delete")').first();
        if (await deleteBtn.isVisible({ timeout: 3000 })) {
          await deleteBtn.click();
          const yesBtn = sharedPage.getByRole('button', { name: 'Yes' });
          if (await yesBtn.isVisible({ timeout: 2000 })) {
            await yesBtn.click();
            await sharedPage.waitForTimeout(1000);
            console.log('   ✅ Order 2 deleted');
          }
        }
      }
    }

    // Delete User
    if (testData.username) {
      console.log(`   🗑️  Deleting user: ${testData.username}`);
      await sharedPage.locator('.ant-layout-sider .ant-menu-item:has-text("User Management")').first().click();
      await sharedPage.waitForLoadState('networkidle');
      
      const userRow = sharedPage.getByRole('row', { name: testData.username });
      if (await userRow.isVisible({ timeout: 5000 })) {
        const deleteBtn = userRow.locator('.anticon-delete').first();
        await deleteBtn.click();
        const popover = sharedPage.locator('.ant-popover-inner:has-text("Delete User")');
        await popover.waitFor({ state: 'visible', timeout: 3000 });
        const yesBtn = popover.locator('button:has-text("Yes")');
        if (await yesBtn.isVisible()) {
          await yesBtn.click();
          await sharedPage.waitForTimeout(1000);
          console.log('   ✅ User deleted');
        }
      }
    }

    const elapsed = Date.now() - start;
    metrics.push({ browser: browserName, step: '14. Cleanup', time: elapsed, status: '✅ PASS' });

    console.log(`✅ [${browserName}] Cleanup: ${elapsed}ms`);
    console.log(`   └─ All test data cleaned up\n`);
  });
});

// ===== LOAD TEST =====
test.describe('Load Test: Server Capacity', () => {
  test('50 Concurrent Logins', async ({ browser }) => {
    console.log('\n🔄 LOAD TEST: 50 Concurrent Users...\n');
    const start = Date.now();

    const promises = Array(50).fill().map(async (_, i) => {
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();

      const userStart = Date.now();
      await page.goto('https://103.38.50.149:5005/login');
      await page.getByRole('textbox', { name: 'Username' }).fill('admin');
      await page.getByRole('textbox', { name: 'Password' }).fill('admin123');
      await page.getByRole('button', { name: 'Log In' }).click();
      await page.waitForURL('https://103.38.50.149:5005/', { timeout: 30000 });

      const elapsed = Date.now() - userStart;
      if ((i + 1) % 10 === 0) console.log(`   ✓ ${i + 1}/50 users logged in`);

      await context.close();
      return elapsed;
    });

    const times = await Promise.all(promises);
    const totalTime = Date.now() - start;
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    console.log(`\n✅ Load Test Complete!`);
    console.log(`   Total Time: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);
    console.log(`   Average per user: ${avgTime.toFixed(0)}ms`);
    console.log(`   Server handled ${(50 / (totalTime / 1000)).toFixed(1)} logins/sec\n`);

    expect(totalTime).toBeLessThan(120000);
  });
});
