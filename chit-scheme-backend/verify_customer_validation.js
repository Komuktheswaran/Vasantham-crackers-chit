const axios = require('axios');

const API_URL = 'http://localhost:5000/api/customers';
const ID_TO_UPDATE = 'TEST_REF_1765443605658'; 

const safeName = "Test User " + Date.now();

// 1. Valid Payload (All Optional Empty) - Should PASS
const payloadValidEmpty = {
  Customer_ID: ID_TO_UPDATE,
  Name: safeName,
  Customer_Type: "New",
  PhoneNumber: 9876543210, 
  Reference_Name: "",
  Address1: "",
  Address2: "",
  Area: "",
  State_ID: "", 
  District_ID: "",
  Pincode: ""
};

// 2. Invalid Pincode - Should FAIL 400
const payloadInvalidPincode = {
  ...payloadValidEmpty,
  Pincode: "123"
};

// 3. Invalid Phone - Should FAIL 400
const payloadInvalidPhone = {
  ...payloadValidEmpty,
  PhoneNumber: "invalid"
};

async function runTests() {
  console.log("--- TEST 1: Valid Payload with Empty Strings ---");
  try {
    await axios.put(`${API_URL}/${ID_TO_UPDATE}`, payloadValidEmpty);
    console.log("✅ PASS: Updated successfully.");
  } catch (error) {
    if (error.response) {
      console.log(`❌ FAIL: Status ${error.response.status}`);
      console.log("Errors:", JSON.stringify(error.response.data.errors, null, 2));
    } else {
      console.log("❌ FAIL: Network/Server Error:", error.message);
    }
  }

  console.log("\n--- TEST 2: Invalid Pincode ---");
  try {
    await axios.put(`${API_URL}/${ID_TO_UPDATE}`, payloadInvalidPincode);
    console.log("❌ FAIL: Should have failed but passed.");
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log("✅ PASS: Failed with 400 as expected.");
      // Check message
      const hasPincodeError = error.response.data.errors.some(e => e.path === 'Pincode' || e.param === 'Pincode');
      if (hasPincodeError) console.log("   (Correctly identified Pincode error)");
      else console.log("   (Unexpected error fields)", error.response.data.errors);
    } else {
      console.log("❌ FAIL: Unexpected status or error:", error.message);
    }
  }

    console.log("\n--- TEST 3: Invalid Phone ---");
  try {
    await axios.put(`${API_URL}/${ID_TO_UPDATE}`, payloadInvalidPhone);
    console.log("❌ FAIL: Should have failed but passed.");
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log("✅ PASS: Failed with 400 as expected.");
    } else {
      console.log("❌ FAIL: Unexpected status or error:", error.message);
    }
  }
}

runTests();
