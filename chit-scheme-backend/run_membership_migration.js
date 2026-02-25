const { executeQuery } = require('./models/db');

async function runMigration() {
    try {
        console.log('1. Adding Membership_ID columns if they do not exist...');
        await executeQuery(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Scheme_Due' AND COLUMN_NAME = 'Membership_ID')
            ALTER TABLE Scheme_Due ADD Membership_ID INT NULL;
        `);
        await executeQuery(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Payment_Master' AND COLUMN_NAME = 'Membership_ID')
            ALTER TABLE Payment_Master ADD Membership_ID INT NULL;
        `);

        console.log('2. Backfilling Membership_ID from Scheme_Members...');
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

        console.log('3. Ensuring Membership_ID has a Unique constraint in Scheme_Members (required for FK)...');
        await executeQuery(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE name = 'UQ_Scheme_Members_Membership_ID' AND type = 'UQ')
            ALTER TABLE Scheme_Members ADD CONSTRAINT UQ_Scheme_Members_Membership_ID UNIQUE (Membership_ID);
        `);

        console.log('4. Adding Foreign Key constraints...');
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
