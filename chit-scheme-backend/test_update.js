const axios = require('axios');

const API_URL = 'http://localhost:5000/api/customers';
const customerId = 'TEST_1765439277080'; // Use the ID from the user log or a known one

const updateData = {
  Customer_ID: customerId,
  FirstName: 'UpdatedTest',
  LastName: 'User',
  PhoneNumber: '9876543210',
  State_ID: 1,
  District_ID: 1,
  Pincode: '123456',
  // include other required fields to pass validation
};

async function testUpdate() {
  console.log(`Testing PUT ${API_URL}/${customerId}`);
  try {
    const res = await axios.put(`${API_URL}/${customerId}`, updateData);
    console.log('✅ Update Success:', res.data);
  } catch (err) {
    if (err.response) {
      console.error(`❌ Update Failed: ${err.response.status} ${err.response.statusText}`);
      console.error('Data:', err.response.data);
    } else {
      console.error('❌ Network/Other Error:', err.message);
    }
  }
}

testUpdate();
