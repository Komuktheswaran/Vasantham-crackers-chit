const { dbConfig, sql } = require('./config/database');

async function inspect() {
    try {
        await sql.connect(dbConfig);
        
        console.log('--- Latest Customers ---');
        const custs = await new sql.Request().query(`
            SELECT TOP 5 Customer_ID, Name FROM Customer_Master ORDER BY Customer_ID DESC
        `);
        console.table(custs.recordset);

        if (custs.recordset.length > 0) {
            const latestId = custs.recordset[0].Customer_ID;
            console.log(`--- Checking Scheme Members for ${latestId} ---`);
            const members = await new sql.Request().query(`
                SELECT * FROM Scheme_Members WHERE Customer_ID = '${latestId}'
            `);
            console.table(members.recordset);
        }
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

inspect();
