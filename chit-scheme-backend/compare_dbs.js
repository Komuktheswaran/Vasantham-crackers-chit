const sql = require('mssql');
const { dbConfig } = require('./config/database');
const fs = require('fs');

async function debug() {
    let log = '';
    const logger = (msg) => { console.log(msg); log += msg + '\n'; };

    try {
        const livePool = await sql.connect(dbConfig);
        logger('--- VASANTHAMDBLIVE ---');
        const liveTables = await livePool.request().query("SELECT name FROM sys.tables ORDER BY name");
        logger(`Tables: ${liveTables.recordset.map(t => t.name).join(', ')}`);
        
        try {
            const count = await livePool.request().query("SELECT COUNT(*) as c FROM Scheme_Members");
            logger(`Scheme_Members count: ${count.recordset[0].c}`);
        } catch (e) {
            logger(`Scheme_Members check failed: ${e.message}`);
        }
        await livePool.close();

        const vdbConfig = { ...dbConfig, database: 'VASANTHAMDB' };
        const vdbPool = await sql.connect(vdbConfig);
        logger('\n--- VASANTHAMDB ---');
        const vdbTables = await vdbPool.request().query("SELECT name FROM sys.tables ORDER BY name");
        logger(`Tables: ${vdbTables.recordset.map(t => t.name).join(', ')}`);
        
        try {
            const count = await vdbPool.request().query("SELECT COUNT(*) as c FROM Scheme_Members");
            logger(`Scheme_Members count: ${count.recordset[0].c}`);
        } catch (e) {
            logger(`Scheme_Members check failed: ${e.message}`);
        }
        await vdbPool.close();

    } catch (err) {
        logger('FATAL: ' + err.message);
    } finally {
        fs.writeFileSync('compare_dbs.log', log);
        process.exit();
    }
}

debug();
