const sql = require('mssql');
const { dbConfig } = require('./config/database');

// NOTE: Hardcoded Customer ID for testing deletion. 
// REPLACE with a valid deletable test ID or use one created by `create_test_customer.js`
const TEST_CUSTOMER_ID = 'CUST_TEST_DELETE_123'; 

async function testCascadeDelete() {
    try {
        const pool = await sql.connect(dbConfig);
        const transaction = new sql.Transaction(pool);
        
        console.log(`\n🧪 Testing Cascade Delete for ID: ${TEST_CUSTOMER_ID}`);

        // 1. Setup Test Data (if needed) - Comment out if testing existing data
        await transaction.begin();
        
        /* 
        // Create Customer
        await new sql.Request(transaction).query(`
            IF NOT EXISTS (SELECT 1 FROM Customer_Master WHERE Customer_ID = '${TEST_CUSTOMER_ID}')
            INSERT INTO Customer_Master (Customer_ID, Name, Phone_Number) VALUES ('${TEST_CUSTOMER_ID}', 'Test Delete User', 9999999999)
        `);
        // Add Scheme Member
        await new sql.Request(transaction).query(`
            IF NOT EXISTS (SELECT 1 FROM Scheme_Members WHERE Customer_ID = '${TEST_CUSTOMER_ID}')
            INSERT INTO Scheme_Members (Customer_ID, Scheme_ID, Fund_Number, Status) VALUES ('${TEST_CUSTOMER_ID}', 1, 'TEST_FUND_01', 'Active')
        `);
        // Add Due
        await new sql.Request(transaction).query(`
             IF NOT EXISTS (SELECT 1 FROM Scheme_Due WHERE Customer_ID = '${TEST_CUSTOMER_ID}')
             INSERT INTO Scheme_Due (Scheme_ID, Customer_ID, Due_number, Due_amount) VALUES (1, '${TEST_CUSTOMER_ID}', 1, 500)
        `);
        // Add Payment
        await new sql.Request(transaction).query(`
             IF NOT EXISTS (SELECT 1 FROM Payment_Master WHERE Customer_ID = '${TEST_CUSTOMER_ID}')
             INSERT INTO Payment_Master (Customer_ID, Amount_paid, Payment_Mode) VALUES ('${TEST_CUSTOMER_ID}', 500, 'Cash')
        `);
        
        await transaction.commit();
        console.log('✅ Test Data Ensured');
        */
       
       // Note: Since we are verifying the API controller which has its own transaction logic,
       // We should ideally call the controller function or replicate its logic exactly.
       // However, simply running the query the controller runs is a good proxy if we can't mock req/res easily.
       
       // Let's Simulate Controller Logic Execution
       // But wait, we can't import controller easily without mocking req/res. 
       // So we will just run the logic block we wrote to verify syntax/logic validity.
       
       const deleteTx = new sql.Transaction(pool);
       await deleteTx.begin();
       
       console.log('🔄 Attempting Deletion...');
       
       // 0. Update Test Script to include Auctions (matched controller)
       const r0 = new sql.Request(deleteTx);
       await r0.input('customerId', sql.VarChar(50), TEST_CUSTOMER_ID)
                .query('DELETE FROM Auctions WHERE Customer_ID = @customerId');

       // 1. Delete Payments
       const r1 = new sql.Request(deleteTx);
       await r1.input('customerId', sql.VarChar(50), TEST_CUSTOMER_ID)
                .query('DELETE FROM Payment_Master WHERE Customer_ID = @customerId');
       
       // 2. Delete Scheme Dues
       const r2 = new sql.Request(deleteTx);
       await r2.input('customerId', sql.VarChar(50), TEST_CUSTOMER_ID)
               .query('DELETE FROM Scheme_Due WHERE Customer_ID = @customerId');

       // 3. Delete Scheme Memberships
       const r3 = new sql.Request(deleteTx);
       await r3.input('customerId', sql.VarChar(50), TEST_CUSTOMER_ID)
               .query('DELETE FROM Scheme_Members WHERE Customer_ID = @customerId');

       // 4. Delete Customer
       const r4 = new sql.Request(deleteTx);
       await r4.input('customerId', sql.VarChar(50), TEST_CUSTOMER_ID)
               .query('DELETE FROM Customer_Master WHERE Customer_ID = @customerId');

       await deleteTx.rollback(); // Rollback so we don't actually destroy data if testing on real DB, or commit if confident.
       // For verification of "it runs without error" - Rollback is safer.
       console.log('✅ Deletion Logic Ran Successfully (Rolled back for safety)');
       
    } catch (error) {
        console.error('❌ Test Failed:', error);
    } finally {
        await sql.close();
    }
}

testCascadeDelete();
