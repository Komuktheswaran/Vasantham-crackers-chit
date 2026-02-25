const sql = require('mssql');
const { dbConfig } = require('./config/database');
const fs = require('fs');

async function debug() {
    let log = '';
    const logger = (msg) => { console.log(msg); log += msg + '\n'; };

    try {
        const otherConfig = { ...dbConfig, database: 'VASANTHAMDB' };
        logger(`Connecting to: ${otherConfig.server} DB: ${otherConfig.database}`);
        const pool = await sql.connect(otherConfig);
        
        logger('1. Listing all tables in VASANTHAMDB...');
        const tables = await pool.request().query("SELECT name FROM sys.tables ORDER BY name");
        logger(`Tables in VASANTHAMDB: ${tables.recordset.map(t => t.name).join(', ')}`);

    } catch (err) {
        logger('FATAL: ' + JSON.stringify(err, null, 2));
    } finally {
        fs.writeFileSync('raw_dbg.log', log);
        process.exit();
    }
}

debug();
