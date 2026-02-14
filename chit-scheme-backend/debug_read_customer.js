const sql = require('mssql');
const { dbConfig } = require('./config/database');

async function debugRead() {
    try {
        await sql.connect(dbConfig);
        const result = await sql.query(`
            SELECT sm.Customer_ID, sm.Scheme_ID, sm.Fund_Number, sm.Status, cm.Name as Scheme_Name
            FROM Scheme_Members sm
            JOIN Chit_Master cm ON sm.Scheme_ID = cm.Scheme_ID
            WHERE sm.Customer_ID LIKE '%test_cust_1770985141868%'
        `);
        console.log('Scheme Members Found:', result.recordset);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

debugRead();
