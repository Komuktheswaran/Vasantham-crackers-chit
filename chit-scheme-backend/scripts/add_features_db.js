const { executeQuery } = require('../models/db');

const runMigration = async () => {
  try {
    console.log('Starting migration...');

    // 1. Add Bonus_Percentage to Chit_Master
    try {
      await executeQuery(`
        IF NOT EXISTS (
          SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'Chit_Master' AND COLUMN_NAME = 'Bonus_Percentage'
        )
        BEGIN
          ALTER TABLE Chit_Master ADD Bonus_Percentage DECIMAL(5, 2) NULL;
          PRINT 'Added Bonus_Percentage column to Chit_Master';
        END
        ELSE
        BEGIN
          PRINT 'Bonus_Percentage column already exists';
        END
      `);
      console.log('✅ Checked/Added Bonus_Percentage column');
    } catch (err) {
      console.error('❌ Error adding Bonus_Percentage:', err.message);
    }

    // 2. Create Order_Tracking table
    try {
      await executeQuery(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Order_Tracking')
        BEGIN
          CREATE TABLE Order_Tracking (
            Tracking_ID INT PRIMARY KEY IDENTITY(1,1),
            Tracking_Number VARCHAR(100), -- For Tracking / LLM Number
            Order_Number VARCHAR(100),
            Customer_ID VARCHAR(50), -- Optional FK
            Fund_Number VARCHAR(50), -- Optional
            Order_Received_Date DATE,
            Payment_Received_Date DATE,
            Payment_Amount DECIMAL(18, 2),
            Transporter_Name VARCHAR(100),
            Transporter_Contact VARCHAR(50),
            Source VARCHAR(50), -- Website, Whatsapp, In Store
            Created_At DATETIME DEFAULT GETDATE(),
            
            FOREIGN KEY (Customer_ID) REFERENCES Customer_Master(Customer_ID)
          );
          PRINT 'Created Order_Tracking table';
        END
        ELSE
        BEGIN
          PRINT 'Order_Tracking table already exists';
        END
      `);
      console.log('✅ Checked/Created Order_Tracking table');
    } catch (err) {
      console.error('❌ Error creating Order_Tracking table:', err.message);
    }

    console.log('Migration completed.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
