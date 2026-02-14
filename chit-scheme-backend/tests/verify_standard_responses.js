const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

const testEndpoints = async () => {
  console.log('🧪 Starting Verification of Standardized Responses...');

  // 1. Test Success Response (GET States)
  try {
    console.log('\n[1] Testing Success Response (GET /states)...');
    const response = await axios.get(`${BASE_URL}/states`);
    
    // Check Status
    if (response.status === 200) {
      console.log('✅ Status 200 OK');
    } else {
      console.error('❌ Unexpected Status:', response.status);
    }

    // Check Format
    const data = response.data;
    if (data.success === true && data.message && Array.isArray(data.data)) {
      console.log('✅ Standard Format Verified: { success: true, message: "...", data: [...] }');
    } else {
      console.error('❌ Invalid Format:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Failed to fetch states:', error.message);
  }

  // 2. Test Error Response (GET Non-existent Customer)
  try {
    console.log('\n[2] Testing Error Response (GET /customers/non-existent-id)...');
    await axios.get(`${BASE_URL}/customers/invalid-id-X99`);
    console.error('❌ Expected 404 but got Success');
  } catch (error) {
    if (error.response) {
      // Check Status
      if (error.response.status === 404) {
        console.log('✅ Status 404 OK');
      } else {
        console.error('❌ Unexpected Status:', error.response.status);
      }

      // Check Format
      const data = error.response.data;
      if (data.success === false && data.message) {
        console.log('✅ Standard Format Verified: { success: false, message: "...", error: ... }');
        console.log('   Message:', data.message);
      } else {
        console.error('❌ Invalid Format:', JSON.stringify(data, null, 2));
      }
    } else {
      console.error('❌ Network/Server Error:', error.message);
    }
  }

  // 3. Test Validation Error (POST Transporter with missing fields)
  try {
    console.log('\n[3] Testing Validation Error (POST /transporters)...');
    await axios.post(`${BASE_URL}/transporters`, {}); // Empty body
    // If validation is missing, this might succeed or fail with 500
    // We expect 400 or 500 but with standard format
    console.warn('⚠️ Request succeeded unexpectedly (Validation might be missing)');
  } catch (error) {
    if (error.response) {
      console.log(`✅ Request Failed with Status ${error.response.status}`);
      
      const data = error.response.data;
      if (data.success === false && data.message) {
        console.log('✅ Standard Error Format Verified');
        console.log('   Message:', data.message);
        console.log('   Error Details:', data.error);
      } else {
        console.error('❌ Invalid Error Format:', JSON.stringify(data, null, 2));
      }
    } else {
      console.error('❌ Network/Server Error:', error.message);
    }
  }

  console.log('\n🏁 Verification Complete.');
};

testEndpoints();
