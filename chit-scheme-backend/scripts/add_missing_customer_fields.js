const { executeQuery } = require('../models/db');

const runMigration = async () => {
  try {
    console.log('Starting migration: Adding missing fields to Customer_Master...');

    await executeQuery(`
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Customer_Master' AND COLUMN_NAME = 'Reference_Phone'
      )
      BEGIN
        ALTER TABLE Customer_Master ADD Reference_Phone VARCHAR(50) NULL;
        PRINT 'Added Reference_Phone column to Customer_Master';
      END

      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Customer_Master' AND COLUMN_NAME = 'Delivery_Point_ID'
      )
      BEGIN
        ALTER TABLE Customer_Master ADD Delivery_Point_ID INT NULL;
        PRINT 'Added Delivery_Point_ID column to Customer_Master';
      END
    `);

    console.log('✅ Migration completed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

runMigration();
