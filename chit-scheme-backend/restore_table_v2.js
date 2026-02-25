const sql = require('mssql');
const { dbConfig } = require('./config/database');

async function restoreTable() {
    try {
        console.log('Connecting to server...');
        const pool = await sql.connect(dbConfig);
        
        console.log('Current Database:', (await pool.request().query("SELECT DB_NAME() as db")).recordset[0].db);

        console.log('Checking for Scheme_Members in any database...');
        const checkSrc = await pool.request().query("SELECT name FROM VASANTHAMDB.sys.tables WHERE name = 'Scheme_Members'");
        
        if (checkSrc.recordset.length === 0) {
            console.error('Scheme_Members NOT FOUND in VASANTHAMDB!');
            process.exit(1);
        }

        console.log('Dropping Scheme_Members in VASANTHAMDBLIVE if it somehow exists but is hidden...');
        try {
            await pool.request().query("IF OBJECT_ID('VASANTHAMDBLIVE.dbo.Scheme_Members', 'U') IS NOT NULL DROP TABLE VASANTHAMDBLIVE.dbo.Scheme_Members");
        } catch (e) { console.log('Drop skipped or failed:', e.message); }

        console.log('Creating Scheme_Members in VASANTHAMDBLIVE from VASANTHAMDB...');
        await pool.request().query(`
            SELECT * 
            INTO VASANTHAMDBLIVE.dbo.Scheme_Members 
            FROM VASANTHAMDB.dbo.Scheme_Members
        `);

        console.log('Verification:');
        const verify = await pool.request().query("SELECT name FROM VASANTHAMDBLIVE.sys.tables WHERE name = 'Scheme_Members'");
        console.log('Table exists after restore:', verify.recordset.length > 0);

    } catch (err) {
        console.error('Restore failed:', err.message);
        console.dir(err);
    } finally {
        process.exit();
    }
}

restoreTable();
