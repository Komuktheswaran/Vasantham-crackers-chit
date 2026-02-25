const sql = require('mssql');
const { dbConfig } = require('./config/database');

async function restoreTable() {
    try {
        console.log('Connecting to server...');
        const pool = await sql.connect(dbConfig);
        
        console.log('Checking if Scheme_Members exists in VASANTHAMDB...');
        const checkSrc = await pool.request().query("SELECT * FROM VASANTHAMDB.INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Scheme_Members'");
        
        if (checkSrc.recordset.length === 0) {
            console.error('Scheme_Members NOT FOUND in VASANTHAMDB either!');
            process.exit(1);
        }

        console.log('Creating Scheme_Members in VASANTHAMDBLIVE from VASANTHAMDB...');
        // Using SELECT INTO to copy structure and data
        await pool.request().query(`
            SELECT * 
            INTO VASANTHAMDBLIVE.dbo.Scheme_Members 
            FROM VASANTHAMDB.dbo.Scheme_Members
        `);

        console.log('Success! Table restored.');

    } catch (err) {
        console.error('Restore failed:', err.message);
    } finally {
        process.exit();
    }
}

restoreTable();
