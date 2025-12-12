const axios = require('axios');

const API_URL = 'http://localhost:5000/api/customers';
const ID_TO_UPDATE = 'TEST_REF_1765443605658'; // User provided ID

const payloadNumeric = {
  Customer_ID: ID_TO_UPDATE,
  Name: "Test User Numeric Types",
  Customer_Type: "New",
  PhoneNumber: 9876543210, // Sending as Number
  Reference_Name: "",
  Address1: "",
  Address2: "",
  Area: "",
  State_ID: "",
  District_ID: "",
  Pincode: 600001 // Sending as Number
};

async function testUpdate() {
  try {
    console.log("Sending Payload with Numeric Types:", payloadNumeric);
    const res = await axios.put(`${API_URL}/${ID_TO_UPDATE}`, payloadNumeric);
    console.log("Success:", res.data);
  } catch (error) {
    if (error.response) {
      console.error("Failed:", error.response.status);
      console.log("Errors:", JSON.stringify(error.response.data.errors, null, 2));
    } else {
      console.error("Error:", error.message);
    }
  }
}

testUpdate();
