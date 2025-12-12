const axios = require('axios');

const API_URL = 'http://localhost:5000/api/customers';
const ID_TO_UPDATE = 'TEST_REF_1765443605658'; 

const payloadMissingID = {
  // Customer_ID is MISSING
  Name: "Test User Missing ID",
  Customer_Type: "New",
  PhoneNumber: 9876543210, 
  Address1: "123 Main St"
};

async function runTest() {
  console.log("--- TEST: Payload Missing Customer_ID ---");
  try {
    await axios.put(`${API_URL}/${ID_TO_UPDATE}`, payloadMissingID);
    console.log("❌ FAIL: Should have failed but passed.");
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log("✅ PASS: Failed with 400 as expected.");
      // Check message
      const hasIdError = error.response.data.errors.some(e => e.msg === 'Customer ID is required');
      if (hasIdError) console.log("   (Correctly identified 'Customer ID is required' error)");
      else console.log("   (Unexpected error fields)", JSON.stringify(error.response.data.errors, null, 2));
    } else {
      console.log("❌ FAIL: Unexpected status or error:", error.message);
    }
  }
}

runTest();
