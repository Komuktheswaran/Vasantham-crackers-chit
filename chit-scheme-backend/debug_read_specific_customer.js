const sql = require('mssql');
const { dbConfig } = require('./config/database');

async function debugRead() {
    try {
        console.log('Connecting to DB...');
        await sql.connect(dbConfig);
        console.log('Connected. Querying...');
        
        // Check Customer Master
        const customerCheck = await sql.query(`
            SELECT Customer_ID, Name 
            FROM Customer_Master WITH (NOLOCK)
            WHERE Customer_ID = 'test_cust_1770985141868'
        `);
        console.log('Customer Master Results:', customerCheck.recordset);

        // Dump ALL Scheme Members
        const allMembers = await sql.query(`
            SELECT * FROM Scheme_Members WITH (NOLOCK)
        `);
        console.log('ALL Scheme Members:', allMembers.recordset);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

debugRead();
