const { dbConfig, sql } = require('./config/database');

async function inspect() {
    try {
        await sql.connect(dbConfig);
        
        console.log('--- Checking Latest Scheme_Due Entries (Top 10) ---');
        const result = await new sql.Request().query(`
             SELECT TOP 10 Scheme_ID, Customer_ID, Due_number, Fund_Number 
             FROM Scheme_Due 
             ORDER BY Customer_ID DESC, Due_number ASC
        `);
        console.table(result.recordset);
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

inspect();
