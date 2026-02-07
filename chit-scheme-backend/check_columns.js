const { executeQuery } = require('./models/db');

async function checkColumns() {
  try {
    const result = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Customer_Master'
    `);
    console.log("Columns:", result.map(r => r.COLUMN_NAME));
  } catch (err) {
    console.error(err);
  }
}

checkColumns();
