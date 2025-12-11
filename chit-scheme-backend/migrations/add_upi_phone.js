const sql = require('mssql');
const { dbConfig } = require('../config/database');

async function addUpiPhoneColumn() {
  try {
    console.log('Connecting to database...');
    await sql.connect(dbConfig);
    console.log('Connected.');

    const checkColumnQuery = `
      SELECT count(*) as count 
      FROM information_schema.columns 
      WHERE table_name = 'Payment_Master' AND column_name = 'UPI_Phone_Number'
    `;

    const result = await sql.query(checkColumnQuery);
    
    if (result.recordset[0].count === 0) {
      console.log('Adding UPI_Phone_Number column...');
      await sql.query(`
        ALTER TABLE Payment_Master 
        ADD UPI_Phone_Number VARCHAR(20)
      `);
      console.log('UPI_Phone_Number column added successfully.');
    } else {
      console.log('UPI_Phone_Number column already exists.');
    }

  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await sql.close();
  }
}

addUpiPhoneColumn();
