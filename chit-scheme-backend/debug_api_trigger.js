const sql = require('mssql');
const { dbConfig } = require('./config/database');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Hardcoded for now from .env provided in context steps
const JWT_SECRET = '6fdf5bd4b426701db5dc406f2dc986fae9b65ae630edd8ada519558a94609bfbc8147802266a3ca1a831ab7fcc1fae0487bda4698441051d3f14a9e791f6c675';

async function triggerApi() {
    try {
        console.log('1. Fetching a user to simulate login...');
        await sql.connect(dbConfig);
        const userRes = await sql.query('SELECT TOP 1 User_ID, Username, Role FROM Users');
        await sql.close();

        if (userRes.recordset.length === 0) {
            console.error('No users found in Users table.');
            return;
        }

        const user = userRes.recordset[0];
        console.log('   User found:', user.Username);

        console.log('2. Generating Token...');
        const token = jwt.sign(
            { id: user.User_ID, username: user.Username, role: user.Role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log('   Token generated.');

        console.log('3. Calling API with fund_number=fund/2026/001 ...');
        const fundNum = 'fund/2026/001';
        try {
            const response = await axios.get('http://localhost:5000/api/customers', {
                params: {
                    fund_number: fundNum,
                    limit: 1
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            console.log('   API Status:', response.status);
            console.log('   API Data Customers Length:', response.data.data.customers.length);
            console.log('   API Data:', JSON.stringify(response.data.data.customers, null, 2));

        } catch (apiErr) {
            console.error('   API Call Failed:', apiErr.response ? apiErr.response.data : apiErr.message);
        }

    } catch (err) {
        console.error('Script Error:', err);
    }
}

triggerApi();
