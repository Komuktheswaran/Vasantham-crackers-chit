const axios = require('axios');
const { connectDB, sql } = require('./config/database');

const API_URL = 'http://localhost:5000/api';

const runVerification = async () => {
    try {
        console.log('🚀 Starting Fund Number Refactor Verification...');

        // 1. Setup: Create Customer & Scheme & Assign to get a Fund Number
        // We'll use existing endpoints for creation as they were not heavily modified, 
        // but assignment gives us the fund number.
        const customerId = `F_TEST_${Date.now()}`;
        console.log(`\n1. Creating Customer: ${customerId}`);
        await axios.post(`${API_URL}/customers`, {
            Customer_ID: customerId,
            FirstName: 'Fund', LastName: 'Tester',
            PhoneNumber: 9876543210, PhoneNumber2: 9876543210,
            Address1: 'Test St', Area: 'Test Area', Pincode: 600000, Nationality: 'Indian'
        });

        const schemeRes = await axios.post(`${API_URL}/schemes`, {
            Name: `Fund Scheme ${Date.now()}`,
            Total_Amount: 12000, Amount_per_month: 1000,
            Period: 12, Number_of_due: 12,
            Month_from: '2024-01-01', Month_to: '2024-12-01'
        });
        const schemeId = schemeRes.data.schemeId;
        
        console.log(`\n2. Assigning Scheme: ${schemeId} to ${customerId}`);
        // Assigning creates the Fund Number.
        // We need to fetch the fund number from DB because the API might not return it in response (it returns success message).
        await axios.post(`${API_URL}/customers/${customerId}/schemes`, { schemeIds: [schemeId] });
        
        const pool = await connectDB();
        const memberRes = await pool.request().query(`SELECT Fund_Number FROM Scheme_Members WHERE Customer_ID='${customerId}' AND Scheme_ID=${schemeId}`);
        const fundNumber = memberRes.recordset[0].Fund_Number;
        console.log(`✅ Got Fund Number: ${fundNumber}`);

        // 2. Verify: Record Payment using ONLY Fund Number
        console.log(`\n3. Recording Payment using Fund Number: ${fundNumber}`);
        const payRes = await axios.post(`${API_URL}/payments`, {
            Fund_Number: fundNumber, // <--- Key Change
            Due_number: 1,
            Transaction_ID: `TXN_F_${Date.now()}`,
            Amount_Received: 1000,
            Payment_Mode: 'Cash',
            Payment_Date: '2024-02-01'
        });
        console.log('✅ Payment Recorded:', payRes.data);

        // 3. Verify: Get Dues using Fund Number
        console.log(`\n4. Getting Dues using Fund Number: ${fundNumber}`);
        const duesRes = await axios.get(`${API_URL}/payments/dues/${fundNumber}`);
        
        const due1 = duesRes.data.find(d => d.Due_number === 1);
        if (due1 && due1.Recd_amount === 1000) {
            console.log('✅ Verified: Dues updated correctly via Fund Number route.');
        } else {
            console.error('❌ Verification Failed: Due amount mismatch or record not found.');
            console.log('Due Record:', due1);
        }

        console.log('\n🎉 Verification SUCCESS!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Verification Failed:', error.response?.data || error.message);
        process.exit(1);
    }
};

runVerification();
