const sql = require('mssql');
const fs = require('fs');
const config = require('./config/database').dbConfig;

async function run() {
  await sql.connect(config);
  
  const res1 = await sql.query("SELECT TOP 5 * FROM Payment_Master WHERE Fund_Number = 'F2026/225'");
  const res2 = await sql.query("SELECT TOP 5 * FROM Scheme_Due WHERE Fund_Number = 'F2026/225'");
  
  fs.writeFileSync('db_dump.json', JSON.stringify({
    Payment_Master: res1.recordset,
    Scheme_Due: res2.recordset
  }, null, 2));
  
  sql.close();
}
run();
