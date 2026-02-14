const sql = require('mssql');
const { dbConfig } = require('./config/database');

async function debugAuctionSearch() {
    try {
        console.log('Connecting to DB...');
        await sql.connect(dbConfig);
        
        const searchFund = 'fund/2026/001';
        console.log(`Searching for Fund Number: ${searchFund}`);

        // 1. Direct Check in Scheme_Members
        const directCheck = await sql.query(`
            SELECT * FROM Scheme_Members WHERE Fund_Number = '${searchFund}'
        `);
        console.log('Direct Match (Equal):', directCheck.recordset.length);
        if (directCheck.recordset.length > 0) console.log(directCheck.recordset[0]);

        // 2. Like Check
        const likeCheck = await sql.query(`
            SELECT * FROM Scheme_Members WHERE Fund_Number LIKE '%${searchFund}%'
        `);
        console.log('Like Match:', likeCheck.recordset.length);

        // 3. Simulate Controller Query Logic
        const paramValue = `%${searchFund}%`;
        const controllerLogic = await sql.query(`
            SELECT c.Customer_ID, c.Name, sm.Fund_Number
            FROM Customer_Master c
            INNER JOIN Scheme_Members sm ON c.Customer_ID = sm.Customer_ID
            WHERE sm.Fund_Number LIKE '${paramValue}'
        `);
         console.log('Controller Logic Match:', controllerLogic.recordset.length);
         if (controllerLogic.recordset.length > 0) console.log(controllerLogic.recordset);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

debugAuctionSearch();
