const axios = require('axios');
const { executeQuery } = require('../models/db');
const sql = require('mssql');

async function testSingleSchemeEnforcement() {
    try {
        console.log('--- Testing Single Scheme Enforcement (Clean Data) ---');
        
        // 1. Create a FRESH customer
        const timestamp = Date.now();
        const customerId = `test_cust_${timestamp}`;
        // Verify 2 DIFFERENT schemes exist
        const schemes = await executeQuery('SELECT TOP 2 Scheme_ID FROM Chit_Master');
        if (schemes.length < 2) {
             console.log('Not enough schemes to test.'); return;
        }
        const schemeA = schemes[0].Scheme_ID;
        const schemeB = schemes[1].Scheme_ID;

        console.log(`Creating Customer: ${customerId}`);
        // Insert directly to DB for speed
        await executeQuery(`
            INSERT INTO Customer_Master (Customer_ID, Name, Phone_Number) 
            VALUES (@param0, @param1, @param2)
        `, [
            { value: customerId, type: sql.VarChar },
            { value: 'Test User', type: sql.VarChar },
            { value: '9999999999', type: sql.VarChar }
        ]);

        console.log(`1. Assigning Scheme A (${schemeA})...`);
        await axios.post(`http://localhost:5000/api/customers/${encodeURIComponent(customerId)}/schemes`, {
            schemeIds: [schemeA],
            fundNumber: `FUND-A-${timestamp}`,
            sendWhatsapp: false
        });
        console.log('✅ 1. Assignment A Succeeded.');

        console.log(`2. Attempting to assign Scheme B (${schemeB}) [DIFFERENT]...`);
        try {
            await axios.post(`http://localhost:5000/api/customers/${encodeURIComponent(customerId)}/schemes`, {
                schemeIds: [schemeB],
                fundNumber: `FUND-B-${timestamp}`, // Should be ignored/irrelevant if blocked
                sendWhatsapp: false
            });
            console.log('❌ 2. TEST FAILED: Assignment B succeeded but should have failed.');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ 2. TEST PASSED: Assignment B rejected with 400.');
            } else {
                console.log('❌ 2. TEST FAILED: Unexpected error.', error.message);
            }
        }

        console.log(`3. Attempting to re-assign Scheme A (${schemeA}) [SAME]...`);
        try {
            await axios.post(`http://localhost:5000/api/customers/${encodeURIComponent(customerId)}/schemes`, {
                schemeIds: [schemeA],
                fundNumber: `FUND-A-${timestamp}`,
                sendWhatsapp: false
            });
             console.log('✅ 3. IDEMPOTENCY PASSED: ' + (decodeURI(JSON.stringify(response.data.message)) || 'OK'));
        } catch (error) {
            // Note: If backend sends "Scheme already assigned" as success, this stays in try block.
            // If we throw error for "already assigned", it goes here.
            // My code returns success for existing (filter logic).
            // Wait, my code returns success if filtered list is empty.
            if(error.response) console.log('❌ 3. IDEMPOTENCY FAILED:', error.response.data);
            else console.log('✅ 3. IDEMPOTENCY PASSED (No Change).');
        }
        
        // Cleanup
        // await executeQuery('DELETE FROM Customer_Master WHERE Customer_ID = @p0', [{value: customerId, type: sql.VarChar}]);

    } catch (error) {
        console.error('Test Script Error:', error.message);
        if(error.response) console.log(error.response.data);
    }
}

testSingleSchemeEnforcement();
