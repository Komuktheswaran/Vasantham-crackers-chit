const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const testCustomer = {
  Customer_ID: `TEST_${Date.now()}`,
  FirstName: 'Test',
  LastName: 'User',
  PhoneNumber: '9876543210',
  State_ID: 1, // Assuming State ID 1 exists, if strict FK this might fail, but let's try
  District_ID: 1
};

async function verifyBackend() {
  console.log('1. Testing Health Check...');
  try {
    const health = await axios.get(`${API_URL}/health`);
    console.log('✅ Health Check Passed:', health.data.status);
  } catch (err) {
    console.error('❌ Health Check Failed:', err.message);
    return; // Stop if server is down
  }

  console.log('\n2. Testing Customer Creation...');
  try {
    const res = await axios.post(`${API_URL}/customers`, testCustomer);
    console.log('✅ Customer Created:', res.data);
  } catch (err) {
    console.error('❌ Customer Creation Failed:', err.response ? err.response.data : err.message);
  }
  
  if (testCustomer.Customer_ID) {
      console.log('\n3. Testing Check ID...');
      try {
          const res = await axios.get(`${API_URL}/customers/check/${testCustomer.Customer_ID}`);
          console.log('✅ Check ID Passed:', res.data);
      } catch (err) {
          console.error('❌ Check ID Failed:', err.response ? err.response.data : err.message);
      }
  }
}

verifyBackend();
