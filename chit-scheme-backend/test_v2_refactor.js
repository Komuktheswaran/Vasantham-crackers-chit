const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api/customers';

async function testRefactor() {
    console.log('🚀 Testing Refactored Customer Module...');
    
    // 1. Create with Scheme Assignment
    const testId = `TEST_REF_${Date.now()}`;
    console.log(`\n1. Testing Create Customer with Scheme (ID: ${testId})...`);
    
    // Assuming Scheme 1 exists (Standard Scheme)
    const payload = {
        Customer_ID: testId,
        Name: "Test User Refactored",
        Reference_Name: "Ref One",
        Customer_Type: "New,Regular Customer",
        PhoneNumber: "9988776655",
        Address1: "123 New St",
        Area: "Test Area",
        State_ID: 1,
        District_ID: 1, // Optional now but sending
        Pincode: "600001",
        // Scheme Assignment
        Scheme_ID: 1,
        Fund_Number: `FN_${testId}`
    };

    try {
        const createRes = await axios.post(API_URL, payload);
        console.log('✅ Create Success:', createRes.data);
    } catch (e) {
        console.error('❌ Create Failed:', e.response?.data || e.message);
        return; // Stop if create fails
    }

    // 2. Verify HAS_SCHEME filter
    console.log('\n2. Testing filter has_scheme=true...');
    try {
        // We just created one with a scheme, so it should appear
        const listRes = await axios.get(`${API_URL}?has_scheme=true&limit=1000`);
        const found = listRes.data.customers.find(c => c.Customer_ID === testId);
        if (found) {
            console.log('✅ Filter Success: Test user found in scheme list.');
        } else {
            console.error('❌ Filter Failed: Test user NOT found in scheme list.');
        }
    } catch (e) {
        console.error('❌ Filter Error:', e.response?.data || e.message);
    }

    // 3. Create WITHOUT Scheme
    const testId2 = `TEST_NOSCHEME_${Date.now()}`;
    console.log(`\n3. Testing Create Customer WITHOUT Scheme (ID: ${testId2})...`);
    try {
         const payload2 = { ...payload, Customer_ID: testId2, Scheme_ID: null, Fund_Number: null, Name: "No Scheme User" };
         await axios.post(API_URL, payload2);
         console.log('✅ Create No-Scheme Success');
         
         // Verify NOT in has_scheme list
         const listRes2 = await axios.get(`${API_URL}?has_scheme=true&search=${testId2}`);
         const found2 = listRes2.data.customers.find(c => c.Customer_ID === testId2);
        if (!found2) {
            console.log('✅ Filter Logic Correct: No-Scheme user NOT in scheme list.');
        } else {
            console.error('❌ Filter Logic Fail: No-Scheme user FOUND in scheme list.');
        }

    } catch (e) {
        console.error('❌ Create No-Scheme Failed:', e.response?.data || e.message);
    }

    // 4. Update Customer (Name change)
    console.log(`\n4. Testing Update Customer (${testId})...`);
    try {
         const updatePayload = {
             Customer_ID: testId,
             Name: "Updated Name Refactored",
             Customer_Type: "Wholesale",
             Reference_Name: "Updated Ref",
             PhoneNumber: "9988776655",
             Address1: "Updated Addr"
         };
         const updateRes = await axios.put(`${API_URL}/${testId}`, updatePayload);
         console.log('✅ Update Success:', updateRes.data);

         // Verify change
         const getRes = await axios.get(`${API_URL}/${testId}`);
         if (getRes.data.Name === "Updated Name Refactored") {
             console.log('✅ Verification: Name updated correctly.');
         } else {
             console.error('❌ Verification Failed: Name mismatch', getRes.data.Name);
         }

    } catch (e) {
        console.error('❌ Update Failed:', e.response?.data || e.message);
    }
}

testRefactor();
