require('dotenv').config();
const sql = require('mssql');
async function run() {
  await sql.connect(process.env.DB_CONNECTION_STRING || {
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, database: process.env.DB_DATABASE,
    options: { encrypt: false, trustServerCertificate: true }
  });
  const res = await sql.query("SELECT TOP 20 Fund_Number FROM Scheme_Members WHERE Fund_Number LIKE '%202%'");
  console.log(res.recordset);
  const res2 = await sql.query("SELECT TOP 20 Fund_Number FROM Scheme_Members WHERE Fund_Number LIKE '%201%'");
  console.log("201 hits:", res2.recordset);
  sql.close();
}
run();
