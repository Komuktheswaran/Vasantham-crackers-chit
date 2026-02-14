const sql = require('mssql');
const { dbConfig } = require('./config/database');

async function testAssignmentPerformance() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(dbConfig);
        
        // 1. Get a test customer (or create one if needed, but for now let's just pick one)
        // We'll pick the latest customer
        const custResult = await pool.request().query("SELECT TOP 1 Customer_ID FROM Customer_Master ORDER BY Customer_ID DESC");
        if (custResult.recordset.length === 0) {
            console.error('No customers found to test with.');
            return;
        }
        const customerId = custResult.recordset[0].Customer_ID;
        console.log(`Testing with Customer ID: ${customerId}`);

        // 2. Get a couple of heavy schemes
        const schemeResult = await pool.request().query("SELECT TOP 3 Scheme_ID, Name, Number_of_due FROM Chit_Master WHERE Number_of_due > 10 ORDER BY Number_of_due DESC");
        if (schemeResult.recordset.length === 0) {
            console.error('No suitable schemes found.');
            return;
        }
        const schemes = schemeResult.recordset.map(s => s.Scheme_ID);
        console.log(`Testing with Schemes: ${schemes.join(', ')}`);

        // 3. Measure assignment time (mocking the controller logic essentially)
        // We will call the API endpoint locally if possible, or just the logic. 
        // Calling the function directly is harder because it expects req/res. 
        // Let's use axios to call the running server? No, user might not have it running. 
        // Let's just import the controller and mock req/res.
        
        const { assignSchemes } = require('./controllers/customerController_v2');
        
        const req = {
            params: { id: customerId },
            body: {
                schemeIds: schemes,
                // fundNumber: 'TEST/FUND/001', // Optional
                sendWhatsapp: false // Don't spam WA
            }
        };

        const res = {
            json: (data) => console.log('Response:', data),
            status: (code) => {
                console.log('Status:', code);
                return { json: (data) => console.log('Response (Error):', data) };
            }
        };

        console.log('Starting assignment...');
        const start = Date.now();
        await assignSchemes(req, res);
        const end = Date.now();
        
        console.log(`Assignment took: ${(end - start) / 1000} seconds`);

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await sql.close();
    }
}

testAssignmentPerformance();
