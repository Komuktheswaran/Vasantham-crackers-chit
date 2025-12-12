const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let token = '';
let customerId = 'TEST_CUST_999';
let schemeId = 1; // Assuming scheme ID 1 exists
let fundNumber = '';

const login = async () => {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        token = res.data.token;
        console.log('✅ Login Successful');
    } catch (error) {
        console.error('❌ Login Failed:', error.response?.data || error.message);
        process.exit(1);
    }
};

const createCustomer = async () => {
    try {
        // First delete if exists
        try { await axios.delete(`${API_URL}/customers/${customerId}`, { headers: { Authorization: `Bearer ${token}` } }); } catch (e) {}

        const res = await axios.post(`${API_URL}/customers`, {
            Customer_ID: customerId,
            Name: 'Test Payment User',
            PhoneNumber: '9998887776',
            Address1: 'Test Address',
            Customer_Type: 'General',
            District_ID: 1, // Assuming valid
            State_ID: 1
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Customer Created');
    } catch (error) {
        console.error('❌ Create Customer Failed:', error.response?.data || error.message);
    }
};

const assignScheme = async () => {
    try {
        await axios.post(`${API_URL}/customers/${customerId}/schemes`, {
            schemeIds: [schemeId]
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Scheme Assigned');
    } catch (error) {
        console.error('❌ Assign Scheme Failed:', error.response?.data || error.message);
    }
};

const verifyFundNumber = async () => {
    try {
        const res = await axios.get(`${API_URL}/customers/${customerId}/schemes`, { headers: { Authorization: `Bearer ${token}` } });
        const schemes = res.data;
        if (schemes.length > 0 && schemes[0].Fund_Number) {
            fundNumber = schemes[0].Fund_Number;
            console.log(`✅ Verified Fund Number: ${fundNumber}`);
        } else {
            throw new Error('Fund Number not found in response');
        }
    } catch (error) {
        console.error('❌ Verify Fund Number Failed:', error.response?.data || error.message);
        process.exit(1);
    }
};

const fetchDues = async () => {
    try {
        const res = await axios.get(`${API_URL}/payments/dues/${fundNumber}`, { headers: { Authorization: `Bearer ${token}` } });
        console.log(`✅ Dues Fetched: ${res.data.length} records`);
    } catch (error) {
        console.error('❌ Fetch Dues Failed:', error.response?.data || error.message);
    }
};

const recordPayment = async () => {
    try {
        const payload = {
            Fund_Number: fundNumber,
            Due_number: 1,
            Amount_Received: 500, // Assuming monthly amount
            Payment_Date: '2025-12-12',
            Payment_Mode: 'UPI',
            Transaction_ID: 'TEST_TXN_001',
            UPI_Phone_Number: '9998887776'
        };
        await axios.post(`${API_URL}/payments`, payload, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Payment Recorded Successfully');
    } catch (error) {
        console.error('❌ Record Payment Failed:', error.response?.data || error.message);
    }
};

const run = async () => {
    await login();
    await createCustomer();
    await assignScheme();
    await verifyFundNumber(); // Crucial Step: Checks frontend requirement
    await fetchDues();
    await recordPayment();
    console.log('🎉 END-TO-END PAYMENT FLOW VERIFIED');
};

run();
