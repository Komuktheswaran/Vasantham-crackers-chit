const { executeUpdate, executeQuery } = require('./models/db');

async function applyFix() {
  try {
    console.log('Checking columns for Customer_Master...');
    const cols = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Customer_Master' 
      AND COLUMN_NAME IN ('Reference_Phone', 'Delivery_Point_ID')
    `);
    
    if (cols.length < 2) {
      console.log('Columns missing. Attempting to add...');
      
      const missing = ['Reference_Phone', 'Delivery_Point_ID'];
      const currentNames = cols.map(c => c.COLUMN_NAME);
      
      if (!currentNames.includes('Reference_Phone')) {
        await executeUpdate("ALTER TABLE Customer_Master ADD Reference_Phone VARCHAR(50)");
        console.log('Added Reference_Phone');
      }
      
      if (!currentNames.includes('Delivery_Point_ID')) {
        await executeUpdate("ALTER TABLE Customer_Master ADD Delivery_Point_ID INT");
        console.log('Added Delivery_Point_ID');
      }
    } else {
      console.log('Customer_Master columns already present.');
    }

    console.log('Checking columns for Order_Tracking...');
    const orderCols = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Order_Tracking' 
      AND COLUMN_NAME = 'Customer_Name'
    `);
    
    if (orderCols.length === 0) {
      await executeUpdate("ALTER TABLE Order_Tracking ADD Customer_Name VARCHAR(255)");
      console.log('Added Customer_Name to Order_Tracking');
    } else {
      console.log('Order_Tracking columns already present.');
    }

    console.log('Verification:');
    const finalCols = await executeQuery(`
      SELECT COLUMN_NAME, TABLE_NAME
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE (TABLE_NAME = 'Customer_Master' AND COLUMN_NAME IN ('Reference_Phone', 'Delivery_Point_ID'))
      OR (TABLE_NAME = 'Order_Tracking' AND COLUMN_NAME = 'Customer_Name')
    `);
    console.log(JSON.stringify(finalCols, null, 2));

  } catch (err) {
    console.error('Fix failed:', err);
  } finally {
    process.exit();
  }
}

applyFix();
