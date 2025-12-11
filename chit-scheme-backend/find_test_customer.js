const sql = require('mssql');
const { dbConfig } = require('./config/database');

async function run() {
  try {
    await sql.connect(dbConfig);
    console.log('Connected to DB');
    const result = await sql.query('SELECT TOP 1 Customer_ID FROM Scheme_Members');
    if (result.recordset.length > 0) {
      const custId = result.recordset[0].Customer_ID;
      console.log('Customer Found:', custId);
      
      const membersRes = await sql.query(`SELECT Scheme_ID FROM Scheme_Members WHERE Customer_ID = '${custId}'`);
      console.log('Assigned Scheme IDs:', membersRes.recordset.map(r => r.Scheme_ID));

      const schemesRes = await sql.query('SELECT Scheme_ID, Name FROM Chit_Master');
      console.log('All Schemes:', schemesRes.recordset);
    } else {
      console.log('No customers found with schemes.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.close();
  }
}

run();
