const axios = require('axios');
const { executeQuery } = require('./models/db');

const API_URL = 'http://localhost:5000/api';

const runVerification = async () => {
  try {
    console.log('🚀 Starting Backend Verification...');

    // 1. Create Dummy Customer
    const customerId = `TEST_CUST_${Date.now()}`;
    console.log(`\n1. Creating Customer: ${customerId}`);
    await axios.post(`${API_URL}/customers`, {
      Customer_ID: customerId,
      FirstName: 'Test',
      LastName: 'User',
      PhoneNumber: 9999999999,
      PhoneNumber2: 8888888888,
      StreetAddress1: 'Test St',
      StreetAddress2: 'Test Area',
      Area: 'Test Loc',
      Pincode: 600000,
      Nationality: 'Indian'
    });
    console.log('✅ Customer Created');

    // 2. Create Dummy Scheme
    console.log('\n2. Creating Scheme...');
    const schemeRes = await axios.post(`${API_URL}/schemes`, {
      Name: `Test Scheme ${Date.now()}`,
      Total_Amount: 12000,
      Amount_per_month: 1000,
      Period: 12,
      Number_of_due: 12,
      Month_from: '2024-01-01',
      Month_to: '2024-12-01'
    });
    const schemeId = schemeRes.data.schemeId;
    console.log(`✅ Scheme Created: ${schemeId}`);

    // 3. Assign Scheme
    console.log('\n3. Assigning Scheme...');
    await axios.post(`${API_URL}/customers/${customerId}/schemes`, {
      schemeIds: [schemeId]
    });
    console.log('✅ Scheme Assigned');

    // 4. Verify Dues Generated
    console.log('\n4. Verifying Scheme_Due generation...');
    const duesRes = await axios.get(`${API_URL}/payments/dues/${customerId}/${schemeId}`);
    if (duesRes.data.length === 12) {
      console.log(`✅ Dues Generated Correctly (Count: ${duesRes.data.length})`);
    } else {
      console.error(`❌ Dues Generation Failed! Expected 12, got ${duesRes.data.length}`);
      return;
    }

    // 5. Record Payment
    console.log('\n5. Recording Payment for Due #1...');
    await axios.post(`${API_URL}/payments`, {
      Scheme_ID: schemeId,
      Customer_ID: customerId,
      Due_number: 1,
      Transaction_ID: 'TXN_TEST_001',
      Amount_Received: 1000,
      Payment_Date: '2024-01-05'
    });
    console.log('✅ Payment Recorded');

    // 6. Verify Payment Update
    console.log('\n6. Verifying Payment Update in Scheme_Due...');
    const updatedDuesRes = await axios.get(`${API_URL}/payments/dues/${customerId}/${schemeId}`);
    const due1 = updatedDuesRes.data.find(d => d.Due_number === 1);
    
    if (due1.Recd_amount === 1000) {
      console.log('✅ Scheme_Due updated correctly (Recd_amount = 1000)');
    } else {
      console.error(`❌ Scheme_Due update failed! Expected 1000, got ${due1.Recd_amount}`);
    }

    console.log('\n🎉 Backend Verification Completed Successfully!');

  } catch (error) {
    console.error('\n❌ Verification Failed:', error.response?.data || error.message);
  }
};

runVerification();
