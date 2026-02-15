process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const axios = require('axios');

async function testValidation() {
    const API_URL = 'https://103.38.50.149:5006/api/customers'; // Port 5006 based on api.js
    
    const payload = {
        Customer_ID: `DEBUG_${Date.now()}`,
        Customer_Code: `CODE_${Date.now()}`,
        Name: "Test Name",
        PhoneNumber: "9876543210", // Valid 10 digit
        Customer_Type: "New",
        Address1: "Test Address",
        State_ID: 1,
        District_ID: 1,
        Pincode: "600001"
    };

    console.log('--- Testing Valid Payload ---');
    try {
        const res = await axios.post(API_URL, payload);
        console.log('Success:', res.status, res.data);
    } catch (e) {
        console.log('Status:', e.response?.status);
        if (e.response?.data?.errors) {
            console.log('Validation Errors:', JSON.stringify(e.response.data.errors, null, 2));
        } else {
            console.log('Error Data:', JSON.stringify(e.response?.data, null, 2));
        }
    }

    console.log('\n--- Testing Short Name (2 chars) ---');
    try {
        const res = await axios.post(API_URL, { ...payload, Name: "Ab" });
    } catch (e) {
        console.log('Error:', e.response?.status, JSON.stringify(e.response?.data, null, 2));
    }

    console.log('\n--- Testing Invalid Phone (5 digits) ---');
    try {
        const res = await axios.post(API_URL, { ...payload, PhoneNumber: "12345" });
    } catch (e) {
        console.log('Error:', e.response?.status, JSON.stringify(e.response?.data, null, 2));
    }

    console.log('\n--- Testing Invalid Pincode (5 digits) ---');
    try {
        const res = await axios.post(API_URL, { ...payload, Pincode: "12345" });
    } catch (e) {
        console.log('Error:', e.response?.status, JSON.stringify(e.response?.data, null, 2));
    }
}

testValidation();
