const sql = require('mssql');
const { dbConfig } = require('../config/database');

const runMigration = async () => {
    try {
        await sql.connect(dbConfig);
        console.log('Connected to database...');

        // 1. Scheme_Members: Update PK
        console.log('--- Updating Scheme_Members ---');
        
        // Find existing PK name
        const pkResult = await sql.query`
            SELECT name 
            FROM sys.key_constraints 
            WHERE type = 'PK' AND parent_object_id = OBJECT_ID('Scheme_Members')
        `;

        if (pkResult.recordset.length > 0) {
            const pkName = pkResult.recordset[0].name;
            console.log(`Dropping existing PK: ${pkName}`);
            await sql.query(`ALTER TABLE Scheme_Members DROP CONSTRAINT ${pkName}`);
        }

        // Ensure Fund_Number is NOT NULL
        await sql.query`ALTER TABLE Scheme_Members ALTER COLUMN Fund_Number VARCHAR(50) NOT NULL`;

        // Add new PK
        console.log('Adding PK on Fund_Number');
        await sql.query`ALTER TABLE Scheme_Members ADD CONSTRAINT PK_Scheme_Members_Fund_Number PRIMARY KEY (Fund_Number)`;


        // 2. Scheme_Due: Update FK
        console.log('--- Updating Scheme_Due ---');
        
        // Update Fund_Number to NOT NULL in Scheme_Due
        await sql.query`ALTER TABLE Scheme_Due ALTER COLUMN Fund_Number VARCHAR(50) NOT NULL`;

        // Check for existing FK on Fund_Number if any (optional, but good practice)
        // For now, assuming we strictly duplicate the requirement: FK on Fund_Number
        
        // Add FK to Scheme_Members
        // Check if FK exists first to avoid error? Or just try-catch.
        // Let's use a safe add approach.
        const fkResult = await sql.query`
            SELECT name 
            FROM sys.foreign_keys 
            WHERE parent_object_id = OBJECT_ID('Scheme_Due') AND name = 'FK_Scheme_Due_Fund_Number'
        `;

        if (fkResult.recordset.length === 0) {
            console.log('Adding FK_Scheme_Due_Fund_Number');
            await sql.query`
                ALTER TABLE Scheme_Due 
                ADD CONSTRAINT FK_Scheme_Due_Fund_Number 
                FOREIGN KEY (Fund_Number) REFERENCES Scheme_Members(Fund_Number)
            `;
        } else {
            console.log('FK_Scheme_Due_Fund_Number already exists');
        }

        console.log('✅ Migration completed successfully');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await sql.close();
    }
};

runMigration();
