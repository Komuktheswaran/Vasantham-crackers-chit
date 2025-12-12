const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let token = '';
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

const getFundNumber = async () => {
    // We assume a customer exists from previous test
    // Let's just create a new one to be safe
    const customerId = 'CASH_TEST_USER';
    try {
        try { await axios.delete(`${API_URL}/customers/${customerId}`, { headers: { Authorization: `Bearer ${token}` } }); } catch (e) {}

        await axios.post(`${API_URL}/customers`, {
            Customer_ID: customerId,
            Name: 'Cash Test User',
            PhoneNumber: '9991112222',
            Customer_Type: 'General',
            Address1: 'Test Address',
            District_ID: 1, 
            State_ID: 1
        }, { headers: { Authorization: `Bearer ${token}` } });

        await axios.post(`${API_URL}/customers/${customerId}/schemes`, {
            schemeIds: [1]
        }, { headers: { Authorization: `Bearer ${token}` } });
        
        const res = await axios.get(`${API_URL}/customers/${customerId}/schemes`, { headers: { Authorization: `Bearer ${token}` } });
        fundNumber = res.data[0].Fund_Number;
        console.log(`✅ Setup Complete. Fund Number: ${fundNumber}`);

    } catch (error) {
        console.error('❌ Setup Failed:', error.response?.data || error.message);
        process.exit(1);
    }
};

const recordCashPayment = async () => {
    try {
        console.log('Testing Cash Payment (No Transaction ID)...');
        const payload = {
            Fund_Number: fundNumber,
            Due_number: 1,
            Amount_Received: 500, 
            Payment_Date: '2025-12-12',
            Payment_Mode: 'Cash'
            // Transaction_ID deliberately OMITTED
        };
        await axios.post(`${API_URL}/payments`, payload, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Cash Payment Recorded Successfully');
    } catch (error) {
        console.error('❌ Cash Payment Failed:', error.response?.data || error.message);
    }
};

const run = async () => {
    await login();
    await getFundNumber();
    await recordCashPayment();
};

run();
