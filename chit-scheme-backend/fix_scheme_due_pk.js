const { executeQuery } = require('./models/db');
const { connectDB, sql } = require('./config/database');

async function migrate() {
  try {
    const pool = await connectDB();
    console.log('Starting Migration: Fix Scheme_Due PK...');

    // 0. Drop Self-Referencing FK if exists
    try {
        await new sql.Request().query(`ALTER TABLE Scheme_Due DROP CONSTRAINT FK_Scheme_Due_Scheme_Due`);
        console.log('Dropped FK_Scheme_Due_Scheme_Due.');
    } catch (e) {
        console.log('FK_Scheme_Due_Scheme_Due not found or already dropped.');
    }

    // 1. Find Constraint Name
    const constraintRes = await new sql.Request().query(`
      SELECT name 
      FROM sys.key_constraints 
      WHERE type = 'PK' AND parent_object_id = OBJECT_ID('Scheme_Due')
    `);

    // 2. Drop Constraint
    if (constraintRes.recordset.length > 0) {
      const constraintName = constraintRes.recordset[0].name;
      console.log(`Found existing PK: ${constraintName}`);
      await new sql.Request().query(`ALTER TABLE Scheme_Due DROP CONSTRAINT ${constraintName}`);
      console.log('Dropped existing PK.');
    } else {
        console.log('No existing PK found (or already dropped).');
    }

    // 2.5 Ensure No NULL Customer_IDs and Set NOT NULL
    console.log('Ensuring Customer_ID is NOT NULL...');
    try {
        await new sql.Request().query(`DELETE FROM Scheme_Due WHERE Customer_ID IS NULL`); // Safety cleanup
        await new sql.Request().query(`ALTER TABLE Scheme_Due ALTER COLUMN Customer_ID VARCHAR(50) NOT NULL`);
        console.log('Set Customer_ID to NOT NULL.');
    } catch (e) {
        console.error('Error setting NOT NULL:', e.message);
        // Continue, seeing if PK adds anyway (unlikely if nullable)
    }

    // 3. Add New Composite PK
    try {
        await new sql.Request().query(`
            ALTER TABLE Scheme_Due 
            ADD CONSTRAINT PK_Scheme_Due_Composite PRIMARY KEY (Scheme_ID, Customer_ID, Due_number)
        `);
        console.log('✅ Added new composite PK (Scheme_ID, Customer_ID, Due_number).');
    } catch (e) {
        console.log('Error adding new PK (might already exist):', e.message);
    }

    console.log('Migration Complete.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration Failed:', error);
    process.exit(1);
  }
}

migrate();
