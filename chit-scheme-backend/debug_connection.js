const { dbConfig } = require('./config/database');
const { executeQuery } = require('./models/db');

async function debugConnection() {
  try {
    console.log('dbConfig from code:', JSON.stringify(dbConfig, null, 2));
    const serverName = await executeQuery("SELECT @@SERVERNAME as server");
    const dbName = await executeQuery("SELECT DB_NAME() as db");
    const columns = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Customer_Master' 
      AND COLUMN_NAME IN ('Reference_Phone', 'Delivery_Point_ID')
    `);

    console.log('\nRun-time Info:');
    console.log('Actual Server:', serverName[0].server);
    console.log('Actual Database:', dbName[0].db);
    console.log('Columns Found:', JSON.stringify(columns));

  } catch (err) {
    console.error('Debug failed:', err);
  } finally {
    process.exit();
  }
}

debugConnection();
