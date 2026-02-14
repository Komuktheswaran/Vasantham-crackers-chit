const sql = require('mssql');
const { dbConfig } = require('./config/database');

async function debugLifecycle() {
    try {
        await sql.connect(dbConfig);
        const targetCustId = 'test_cust_1770985141868';
        
        console.log(`\n--- Starting Lifecycle Test for ${targetCustId} ---`);

        // 1. Initial Check
        let check = await sql.query(`SELECT * FROM Scheme_Members WHERE Customer_ID = '${targetCustId}'`);
        console.log(`1. Initial State: ${check.recordset.length} schemes found.`);

        if (check.recordset.length > 0) {
            console.log('   (Cleaning up existing data...)');
            await sql.query(`DELETE FROM Scheme_Members WHERE Customer_ID = '${targetCustId}'`);
            await sql.query(`DELETE FROM Scheme_Due WHERE Customer_ID = '${targetCustId}'`);
        }

        // 2. Insert Scheme (Using logic similar to create/assign)
        console.log('2. Inserting Scheme 315...');
        const fundNum = 'fund/debug/' + Date.now();
        await sql.query(`
            INSERT INTO Scheme_Members (Customer_ID, Scheme_ID, Fund_Number, Status, Join_date, Created_at, Updated_at) 
            VALUES ('${targetCustId}', 315, '${fundNum}', 'Active', GETDATE(), GETDATE(), GETDATE())
        `);
        
        check = await sql.query(`SELECT * FROM Scheme_Members WHERE Customer_ID = '${targetCustId}'`);
        console.log(`   Verification: ${check.recordset.length} schemes found. (Should be 1)`);

        // 3. Delete Scheme (Using logic from removeScheme)
        console.log('3. Deleting Scheme 315...');
        const reqDelete = new sql.Request();
        const delResult = await reqDelete.input('cid', sql.VarChar, targetCustId)
                 .input('sid', sql.Int, 315)
                 .query(`DELETE FROM Scheme_Members WHERE Customer_ID = @cid AND Scheme_ID = @sid`);
        
        console.log(`   Rows Affected: ${delResult.rowsAffected[0]}`);

        // 4. Final Verification
        check = await sql.query(`SELECT * FROM Scheme_Members WHERE Customer_ID = '${targetCustId}'`);
        console.log(`4. Final State: ${check.recordset.length} schemes found. (Should be 0)`);

        if (check.recordset.length === 0) {
            console.log('\n✅ SUCCESS: Logic is working correctly.');
        } else {
            console.log('\n❌ FAILURE: Scheme still exists.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

debugLifecycle();
