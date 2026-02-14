const axios = require('axios');
const { executeQuery } = require('../models/db');

async function testAssignment() {
    try {
        console.log('--- Testing Scheme Assignment Fix ---');
        
        // 1. Get a customer
        const customers = await executeQuery('SELECT TOP 1 Customer_ID FROM Customer_Master');
        const customerId = customers[0].Customer_ID;
        console.log('Test Customer:', customerId);

        // 2. Get a scheme
        const schemes = await executeQuery('SELECT TOP 1 Scheme_ID FROM Chit_Master');
        const schemeId = schemes[0].Scheme_ID;
        console.log('Test Scheme:', schemeId);

        // 3. Call API
        console.log('Sending assignment request...');
        try {
            const response = await axios.post(`http://localhost:5000/api/customers/${encodeURIComponent(customerId)}/schemes`, {
                schemeIds: [schemeId],
                fundNumber: `TEST-FUND-${Date.now()}`,
                sendWhatsapp: false
            });
            console.log('Response:', response.data);
            console.log('✅ Assignment Successful!');
        } catch (apiError) {
            console.error('❌ API Error:', apiError.response?.data || apiError.message);
        }

    } catch (error) {
        console.error('Test Failed:', error);
    } process.exit();
}

testAssignment();
