/**
 * Migration: Add Reference_Code column to Customer_Master
 * Run: node scripts/add_reference_code.js
 */
const sql = require('mssql');
const { dbConfig } = require('../config/database');

async function migrate() {
  try {
    const pool = await sql.connect(dbConfig);
    
    // Check if column exists
    const result = await pool.request().query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Customer_Master' AND COLUMN_NAME = 'Reference_Code'
    `);

    if (result.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE Customer_Master ADD Reference_Code VARCHAR(100) NULL;
      `);
      console.log('✅ Added Reference_Code column to Customer_Master');
    } else {
      console.log('ℹ️ Reference_Code column already exists');
    }

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
