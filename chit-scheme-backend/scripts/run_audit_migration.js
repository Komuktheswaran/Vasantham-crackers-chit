const { getPool } = require('../models/db');
const fs = require('fs');
const path = require('path');

const createAuditTable = async () => {
  try {
    const sqlScript = fs.readFileSync(path.join(__dirname, 'create_audit_table.sql'), 'utf-8');
    const pool = await getPool();
    await pool.request().query(sqlScript);
    console.log('✅ Audit_Logs table checked/created successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
};

createAuditTable();
