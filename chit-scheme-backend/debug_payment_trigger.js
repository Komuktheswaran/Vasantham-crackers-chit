const sql = require('mssql');
const { dbConfig } = require('./config/database');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const JWT_SECRET = '6fdf5bd4b426701db5dc406f2dc986fae9b65ae630edd8ada519558a94609bfbc8147802266a3ca1a831ab7fcc1fae0487bda4698441051d3f14a9e791f6c675';

async function triggerPayment() {
    try {
        console.log('1. Generating Token...');
        // Mock user data (admin role usually needed or just valid user)
        const token = jwt.sign(
            { id: 1, username: 'admin', role: 'admin' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log('2. Calling POST /api/payments ...');
        // Scenario 1: Missing Fund_Number
        try {
            console.log('   Test 1: Missing Fund_Number');
            await axios.post('http://localhost:5000/api/payments', {
                Due_number: '1',
                Amount_Received: 500,
                Payment_Mode: 'Cash',
                Payment_Date: '2026-02-13'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.log('   Test 1 Result:', err.response ? err.response.status : err.message);
            if (err.response) console.log('   Test 1 Data:', err.response.data);
        }

        // Scenario 2: Valid Fund_Number (should ideally succeed or fail with DB error if due doesn't exist)
        try {
            console.log('   Test 2: Valid Fund_Number (fund/2026/001)');
            await axios.post('http://localhost:5000/api/payments', {
                Fund_Number: 'fund/2026/001',
                Due_number: '1',
                Amount_Received: 100,
                Payment_Mode: 'Cash',
                Payment_Date: '2026-02-13'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('   Test 2: Success (201)');
        } catch (err) {
            console.log('   Test 2 Result:', err.response ? err.response.status : err.message);
            if (err.response) console.log('   Test 2 Data:', err.response.data);
        }

    } catch (err) {
        console.error('Script Error:', err);
    }
}

triggerPayment();
