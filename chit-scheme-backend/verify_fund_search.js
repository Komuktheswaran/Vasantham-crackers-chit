const { dbConfig } = require('./config/database');
const sql = require('mssql');

async function verifyFundSearch() {
    try {
        await sql.connect(dbConfig);
        console.log('✅ Connected to database');

        // 1. Get a valid Fund Number from DB to test with
        const fundResult = await new sql.Request().query(`
            SELECT TOP 1 Fund_Number FROM Scheme_Members WHERE Fund_Number IS NOT NULL
        `);

        if (fundResult.recordset.length === 0) {
            console.log('⚠️ No Fund Numbers found in Scheme_Members to test with.');
            return;
        }

        const testFundNumber = fundResult.recordset[0].Fund_Number;
        console.log(`🔎 Testing with Fund Number: ${testFundNumber}`);

        // 2. Simulate the Controller Logic
        const result = await new sql.Request().input('param0', sql.VarChar(50), testFundNumber).query(`
            SELECT 
                c.Customer_ID, 
                c.Name, 
                c.Phone_Number,
                sm.Scheme_ID, 
                sm.Fund_Number, 
                cm.Name as Scheme_Name
            FROM Scheme_Members sm
            JOIN Customer_Master c ON sm.Customer_ID = c.Customer_ID
            JOIN Chit_Master cm ON sm.Scheme_ID = cm.Scheme_ID
            WHERE sm.Fund_Number = @param0
        `);

        if (result.recordset.length > 0) {
            console.log('✅ Fund Search Successful!');
            console.table(result.recordset[0]);
        } else {
            console.error('❌ Fund Search Failed - No record found (unexpected)');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await sql.close();
    }
}

verifyFundSearch();
