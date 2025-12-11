const { connectDB, sql } = require('./config/database');

async function killBlockers() {
    try {
        const pool = await connectDB();
        console.log('Finding blocking sessions...');

        const result = await new sql.Request().query(`
            SELECT request_session_id
            FROM sys.dm_tran_locks
            WHERE resource_database_id = DB_ID()
              AND resource_type = 'OBJECT'
              AND resource_associated_entity_id = OBJECT_ID('Scheme_Due')
        `);

        if (result.recordset.length > 0) {
            console.log(`Found ${result.recordset.length} blocking sessions.`);
            for (const row of result.recordset) {
                const spid = row.request_session_id;
                console.log(`Killing session ${spid}...`);
                try {
                     await new sql.Request().query(`KILL ${spid}`);
                     console.log(`Killed ${spid}`);
                } catch (e) {
                    console.log(`Failed to kill ${spid}: ${e.message}`);
                }
            }
        } else {
            console.log('No blocking sessions found for Scheme_Due.');
        }

        process.exit(0);

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

killBlockers();
