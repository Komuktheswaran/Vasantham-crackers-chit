const { connectDB, sql } = require('./config/database');

async function migrate() {
    try {
        const pool = await connectDB();
        console.log('Starting Migration: Add Fund_Number to Scheme_Due...');

        // 1. Add Column if not exists
        const colCheck = await new sql.Request().query(`
            SELECT 1 FROM sys.columns 
            WHERE Name = 'Fund_Number' AND Object_ID = Object_ID('Scheme_Due')
        `);

        if (colCheck.recordset.length === 0) {
            console.log('Adding Fund_Number column...');
            await new sql.Request().query(`ALTER TABLE Scheme_Due ADD Fund_Number VARCHAR(50)`);
            console.log('✅ Column Added.');
        } else {
            console.log('Column Fund_Number already exists.');
        }

        // 2. Backfill Data
        console.log('Backfilling Fund_Number from Scheme_Members...');
        const updateRes = await new sql.Request().query(`
            UPDATE d
            SET d.Fund_Number = m.Fund_Number
            FROM Scheme_Due d
            INNER JOIN Scheme_Members m ON d.Scheme_ID = m.Scheme_ID AND d.Customer_ID = m.Customer_ID
            WHERE d.Fund_Number IS NULL
        `);
        console.log(`✅ Backfilled ${updateRes.rowsAffected[0]} rows.`);

        console.log('Migration Complete.');
        process.exit(0);

    } catch (err) {
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    }
}

migrate();
