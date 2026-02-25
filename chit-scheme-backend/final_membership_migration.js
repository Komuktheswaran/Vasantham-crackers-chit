const { executeQuery } = require('./models/db');

async function runMigration() {
    try {
        console.log('1. Checking and adding Membership_ID to Scheme_Members...');
        const smCols = await executeQuery("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Scheme_Members' AND COLUMN_NAME = 'Membership_ID'");
        if (smCols.length === 0) {
            console.log('Adding Membership_ID to Scheme_Members...');
            await executeQuery("ALTER TABLE Scheme_Members ADD Membership_ID INT NULL");
            
            console.log('Backfilling Membership_ID in Scheme_Members with sequential IDs...');
            // Simple backfill: use ROW_NUMBER or similar
            await executeQuery(`
                WITH CTE AS (
                    SELECT Membership_ID, ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) as row_num
                    FROM Scheme_Members
                )
                UPDATE CTE SET Membership_ID = row_num
            `);
            
            // Make it NOT NULL for integrity since we just filled it
            // await executeQuery("ALTER TABLE Scheme_Members ALTER COLUMN Membership_ID INT NOT NULL");
        }

        console.log('2. checking and adding Membership_ID to related tables...');
        const pdCols = await executeQuery("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Scheme_Due' AND COLUMN_NAME = 'Membership_ID'");
        if (pdCols.length === 0) {
            await executeQuery("ALTER TABLE Scheme_Due ADD Membership_ID INT NULL");
        }

        const pmCols = await executeQuery("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Payment_Master' AND COLUMN_NAME = 'Membership_ID'");
        if (pmCols.length === 0) {
            await executeQuery("ALTER TABLE Payment_Master ADD Membership_ID INT NULL");
        }

        console.log('3. Backfilling Membership_ID in related tables from Scheme_Members...');
        await executeQuery(`
            UPDATE sd 
            SET sd.Membership_ID = sm.Membership_ID 
            FROM Scheme_Due sd 
            JOIN Scheme_Members sm ON sd.Fund_Number = sm.Fund_Number
            WHERE sd.Membership_ID IS NULL;
        `);
        await executeQuery(`
            UPDATE pm 
            SET pm.Membership_ID = sm.Membership_ID 
            FROM Payment_Master pm 
            JOIN Scheme_Members sm ON pm.Fund_Number = sm.Fund_Number
            WHERE pm.Membership_ID IS NULL;
        `);

        console.log('4. Adding Unique constraint to Scheme_Members...');
        await executeQuery(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE name = 'UQ_Scheme_Members_Membership_ID' AND type = 'UQ')
            ALTER TABLE Scheme_Members ADD CONSTRAINT UQ_Scheme_Members_Membership_ID UNIQUE (Membership_ID);
        `);

        console.log('5. Adding Foreign Key constraints...');
        await executeQuery(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE name = 'FK_Scheme_Due_Membership' AND type = 'F')
            ALTER TABLE Scheme_Due ADD CONSTRAINT FK_Scheme_Due_Membership 
            FOREIGN KEY (Membership_ID) REFERENCES Scheme_Members(Membership_ID);
        `);
        await executeQuery(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE name = 'FK_Payment_Master_Membership' AND type = 'F')
            ALTER TABLE Payment_Master ADD CONSTRAINT FK_Payment_Master_Membership 
            FOREIGN KEY (Membership_ID) REFERENCES Scheme_Members(Membership_ID);
        `);

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

runMigration();
