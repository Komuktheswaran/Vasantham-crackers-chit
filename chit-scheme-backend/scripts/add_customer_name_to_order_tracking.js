const { executeQuery } = require('../models/db');

const runMigration = async () => {
  try {
    console.log('Starting migration: Adding Customer_Name to Order_Tracking...');

    await executeQuery(`
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Order_Tracking' AND COLUMN_NAME = 'Customer_Name'
      )
      BEGIN
        ALTER TABLE Order_Tracking ADD Customer_Name VARCHAR(255) NULL;
        PRINT 'Added Customer_Name column to Order_Tracking';
      END
      ELSE
      BEGIN
        PRINT 'Customer_Name column already exists';
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
