const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const API_URL = 'http://localhost:5000/api';
let createdSchemeId = null;
let createdCustomerId = null;

// Test Data
const testScheme = {
    Name: `Test Scheme ${Date.now()}`,
    Total_Amount: 12000,
    Amount_per_month: 1000,
    Period: 12,
    Number_of_due: 12,
    Month_from: '2024-01-01',
    Month_from_disp: '01-01-2024',
    Month_to: '2024-12-01',
    Month_to_disp: '01-12-2024',
    Bonus_Amount: 500 // The new feature
};

const testCustomer = {
    Customer_ID: `CID${Date.now()}`, // Required
    Name: `Test Customer ${Date.now()}`,
    Customer_Code: `CCODE${Date.now()}`, // The new feature
    PhoneNumber: '9999999999', // Correct key
    Customer_Type: 'General', // Required
    Place: 'Test City',
    Address1: '123 Test St', // Matches validator
    District_ID: '', // Optional but validator expects int or empty
    State_ID: '', // Optional
    Pincode: '600001' // valid IN pincode
  };

async function runTests() {
    console.log('🚀 Starting E2E Verification for New Features...');

    try {
        // 1. Test Scheme Creation with Bonus Amount
        console.log('\nTesting Scheme Creation with Bonus Amount...');
        const schemeRes = await axios.post(`${API_URL}/schemes`, testScheme);
        if (schemeRes.status === 201 || schemeRes.status === 200) {
            console.log('✅ Scheme Created Successfully');
            createdSchemeId = schemeRes.data.insertId || schemeRes.data.id; // Adjust based on actual response structure
        } else {
            console.error('❌ Scheme Creation Failed:', schemeRes.status, schemeRes.data);
        }

        // 2. Verify Bonus Amount in Scheme List
        console.log('\nVerifying Bonus Amount in Scheme List...');
        const schemeListRes = await axios.get(`${API_URL}/schemes`);
        const createdScheme = schemeListRes.data.schemes.find(s => s.Name === testScheme.Name);
        if (createdScheme && createdScheme.Bonus_Amount == testScheme.Bonus_Amount) {
            console.log(`✅ Bonus Amount Verified: ${createdScheme.Bonus_Amount}`);
        } else {
            console.error('❌ Bonus Amount Verification Failed. Found:', createdScheme);
        }

        // 3. Test Customer Creation with Customer Code
        console.log('\nTesting Customer Creation with Customer Code...');
        // Note: Customer creation might require login token if protected. Assuming open for test or admin context.
        // If auth is needed, we'd need to login first. I will try without first as per my previous view of routes.
        try {
             const customerRes = await axios.post(`${API_URL}/customers`, testCustomer);
             if (customerRes.status === 201 || customerRes.status === 200) {
                console.log('✅ Customer Created Successfully');
             }
        } catch(e) {
             console.log('⚠️ Customer creation might require auth or failed:', e.message);
        }
        
       
        // 4. Test Search by Customer Code (New Endpoint logic)
        console.log('\nTesting Search by Customer Code...');
        try {
            // Using the global search parameter for Code
            const searchRes = await axios.get(`${API_URL}/customers?search=${testCustomer.Customer_Code}`);
             if (searchRes.data && searchRes.data.customers && searchRes.data.customers.length > 0) {
                 const found = searchRes.data.customers.find(c => c.Customer_Code === testCustomer.Customer_Code);
                 if(found) console.log(`✅ Customer Found by Code: ${found.Customer_Code}`);
                 else console.log('⚠️ Customer not found in search results');
             } else {
                 console.log('⚠️ No results for Customer Code search');
             }

             // Test Search by ID
             console.log('\nTesting Search by Customer ID...');
             const searchResId = await axios.get(`${API_URL}/customers?search=${testCustomer.Customer_ID}`);
             if (searchResId.data && searchResId.data.customers && searchResId.data.customers.length > 0) {
                  const foundId = searchResId.data.customers.find(c => c.Customer_ID === testCustomer.Customer_ID);
                  if(foundId) console.log(`✅ Customer Found by ID: ${foundId.Customer_ID}`);
                  else console.log('⚠️ Customer not found in ID search results');
             } else {
                  console.log('⚠️ No results for Customer ID search');
             }

        } catch (e) {
             console.log('⚠️ Search API failed:', e.message);
        }

    } catch (error) {
        console.error('❌ Test Execution Failed:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

runTests();
