const { executeQuery } = require('./models/db');
const sql = require('mssql');

const updateSchemeTable = async () => {
    try {
        console.log('🔄 Checking Chit_Master table for Bonus_Amount column...');

        // 1. Check if Bonus_Amount exists
        const checkColumn = await executeQuery(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Chit_Master' AND COLUMN_NAME = 'Bonus_Amount'
        `);

        if (checkColumn.length === 0) {
            console.log('⚠️ Bonus_Amount column not found. Adding it...');
            await executeQuery(`
                ALTER TABLE Chit_Master 
                ADD Bonus_Amount DECIMAL(15, 2) DEFAULT 0
            `);
            console.log('✅ Bonus_Amount column added successfully.');
        } else {
            console.log('✅ Bonus_Amount column already exists.');
        }

        // 2. Check if Bonus_Percentage exists (we might want to migrate data or just leave it)
        const checkOldColumn = await executeQuery(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Chit_Master' AND COLUMN_NAME = 'Bonus_Percentage'
        `);

        if (checkOldColumn.length > 0) {
            console.log('⚠️ Bonus_Percentage column exists. You may want to migrate data manually if needed.');
            // Optional: Drop logic or Data Migration logic
            // await executeQuery(`UPDATE Chit_Master SET Bonus_Amount = ... WHERE ...`);
        }

    } catch (error) {
        console.error('❌ Error updating Chit_Master table:', error);
    }
};

updateSchemeTable();
