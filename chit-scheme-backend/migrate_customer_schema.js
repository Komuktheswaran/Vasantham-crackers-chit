const { executeQuery, executeUpdate } = require('./models/db');

const migrate = async () => {
  console.log('🔄 Starting Migration...');
  try {
    // 1. Customer_Master Changes
    console.log('1. Modifying Customer_Master...');
    
    // Check/Add Name
    await executeQuery(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Customer_Master' AND COLUMN_NAME = 'Name')
      BEGIN
        ALTER TABLE Customer_Master ADD Name VARCHAR(255);
      END
    `);

    // Check/Add Reference_Name
    await executeQuery(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Customer_Master' AND COLUMN_NAME = 'Reference_Name')
      BEGIN
        ALTER TABLE Customer_Master ADD Reference_Name VARCHAR(255);
      END
    `);

    // Check/Add Customer_Type
    await executeQuery(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Customer_Master' AND COLUMN_NAME = 'Customer_Type')
      BEGIN
        ALTER TABLE Customer_Master ADD Customer_Type VARCHAR(100);
      END
    `);

    // Data Migration: Name = First_Name + Last_Name
    console.log('   - Migrating Name data...');
    // Only update if Name is NULL (implied fresh migration) or to stay safe
    await executeUpdate(`
      UPDATE Customer_Master 
      SET Name = TRIM(ISNULL(First_Name, '') + ' ' + ISNULL(Last_Name, ''))
      WHERE Name IS NULL OR Name = ''
    `);

    // Drop Columns (First_Name, Last_Name, Nationality)
    // NOTE: Dropping columns can breaking existing code. We will drop them to verify clean slate as requested.
    console.log('   - Dropping old columns...');
    
    // Helper to drop constraint if exists (often needed for columns) - skipping complex constraint check for now assuming standard columns
    try {
        await executeQuery(`
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Customer_Master' AND COLUMN_NAME = 'First_Name') ALTER TABLE Customer_Master DROP COLUMN First_Name;
        `);
    } catch(e) { console.log('Warning dropping First_Name:', e.message); }

    try {
        await executeQuery(`
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Customer_Master' AND COLUMN_NAME = 'Last_Name') ALTER TABLE Customer_Master DROP COLUMN Last_Name;
        `);
    } catch(e) { console.log('Warning dropping Last_Name:', e.message); }

    try {
        await executeQuery(`
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Customer_Master' AND COLUMN_NAME = 'Nationality') ALTER TABLE Customer_Master DROP COLUMN Nationality;
        `);
    } catch(e) { console.log('Warning dropping Nationality:', e.message); }

    // 2. Scheme_Members Changes
    console.log('2. Modifying Scheme_Members...');
    await executeQuery(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Scheme_Members' AND COLUMN_NAME = 'Fund_Number')
      BEGIN
        ALTER TABLE Scheme_Members ADD Fund_Number VARCHAR(50);
      END
    `);
    
    // Add Unique Constraint to Fund_Number if not exists
    await executeQuery(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_Fund_Number')
      BEGIN
        CREATE UNIQUE INDEX UQ_Fund_Number ON Scheme_Members(Fund_Number) WHERE Fund_Number IS NOT NULL;
      END
    `);

    console.log('✅ Migration Completed Successfully!');
  } catch (error) {
    console.error('❌ Migration Failed:', error);
  }
};

migrate();
