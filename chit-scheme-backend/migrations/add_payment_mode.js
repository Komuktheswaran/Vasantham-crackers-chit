const sql = require('mssql');
const { dbConfig } = require('../config/database');

async function addPaymentModeColumn() {
  try {
    console.log('Connecting to database...');
    await sql.connect(dbConfig);
    console.log('Connected.');

    const checkColumnQuery = `
      SELECT count(*) as count 
      FROM information_schema.columns 
      WHERE table_name = 'Payment_Master' AND column_name = 'Payment_Mode'
    `;

    const result = await sql.query(checkColumnQuery);
    
    if (result.recordset[0].count === 0) {
      console.log('Adding Payment_Mode column...');
      await sql.query(`
        ALTER TABLE Payment_Master 
        ADD Payment_Mode VARCHAR(50)
      `);
      console.log('Payment_Mode column added successfully.');
    } else {
      console.log('Payment_Mode column already exists.');
    }

  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await sql.close();
  }
}

addPaymentModeColumn();
