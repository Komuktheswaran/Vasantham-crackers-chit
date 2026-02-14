const sql = require('mssql');
const { dbConfig } = require('./config/database');

async function debugRemoveScheme() {
    try {
        const pool = await sql.connect(dbConfig);
        const transaction = new sql.Transaction(pool);
        
        // 1. Create Test Data
        const testCustId = 'debug_test_cust_' + Date.now();
        
        // Fetch valid Scheme ID using POOL request, not transaction yet
        const schemeRes = await pool.request().query('SELECT TOP 1 Scheme_ID FROM Chit_Master');
        if (schemeRes.recordset.length === 0) {
            console.error('No schemes found in Chit_Master. Cannot run test.');
            return;
        }
        const testSchemeId = schemeRes.recordset[0].Scheme_ID;
        const testFundNum = 'fund/debug/' + Date.now();

        console.log(`Creating test data for Cust: ${testCustId}, Scheme: ${testSchemeId}`);

        // Insert Customer (Simplified) - No transaction for setup to avoid locks
        await pool.request()
            .query(`INSERT INTO Customer_Master (Customer_ID, Name, Phone_Number) VALUES ('${testCustId}', 'Debug User', 1234567890)`);

        // Insert Scheme Member
        await pool.request()
            .input('cid', sql.VarChar, testCustId)
            .input('sid', sql.Int, testSchemeId)
            .input('fnum', sql.VarChar, testFundNum)
            .query(`INSERT INTO Scheme_Members (Customer_ID, Scheme_ID, Fund_Number, Status) VALUES (@cid, @sid, @fnum, 'Active')`);

        console.log('Test data created.');

        // 2. Attempt Removal using the EXACT logic from Controller
        console.log('Attempting removal...');
        const removeTransaction = new sql.Transaction(pool);
        await removeTransaction.begin();

        const reqMember = new sql.Request(removeTransaction);
        const memberResult = await reqMember.input('customerId', sql.VarChar(50), testCustId)
                       .input('schemeId', sql.Int, testSchemeId)
                       .query('DELETE FROM Scheme_Members WHERE Customer_ID = @customerId AND Scheme_ID = @schemeId');
                       
        console.log(`Rows Affected (Members): ${memberResult.rowsAffected[0]}`);

        await removeTransaction.commit();

        // 3. Verify Deletion
        const check = await pool.request()
            .input('cid', sql.VarChar, testCustId)
            .query('SELECT * FROM Scheme_Members WHERE Customer_ID = @cid');
            
        if (check.recordset.length === 0) {
            console.log('SUCCESS: Record was deleted.');
        } else {
            console.error('FAILURE: Record still exists!', check.recordset);
        }

        // Cleanup Customer
        await pool.request().query(`DELETE FROM Customer_Master WHERE Customer_ID = '${testCustId}'`);

    } catch (err) {
        console.error('Debug Error:', err);
    } finally {
        await sql.close();
    }
}

debugRemoveScheme();
