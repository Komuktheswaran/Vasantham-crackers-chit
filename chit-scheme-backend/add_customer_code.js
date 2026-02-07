const { executeQuery } = require('./models/db');

async function addCustomerCode() {
  try {
    // Check if column exists
    const check = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Customer_Master' AND COLUMN_NAME = 'Customer_Code'
    `);

    if (check.length === 0) {
      console.log("Adding Customer_Code to Customer_Master...");
      await executeQuery(`
        ALTER TABLE Customer_Master
        ADD Customer_Code VARCHAR(50) NULL;
      `);
      console.log("Customer_Code column added.");
    } else {
      console.log("Customer_Code column already exists.");
    }
  } catch (err) {
    console.error("Error adding column:", err);
  }
}

addCustomerCode();
