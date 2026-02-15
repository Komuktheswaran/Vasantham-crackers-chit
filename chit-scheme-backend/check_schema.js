const { executeQuery } = require('./models/db');
const fs = require('fs');

async function checkSchema() {
  try {
    const results = [];
    const tables = ['Customer_Master', 'Order_Tracking', 'Scheme_Due', 'Chit_Master', 'Scheme_Members', 'District_Master', 'State_Master', 'Transporters', 'Delivery_Points'];
    for (const table of tables) {
      const cols = await executeQuery(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${table}'
      `);
      results.push({ table, columns: cols });
    }
    fs.writeFileSync('schema_output_full.json', JSON.stringify(results, null, 2));
    console.log('Full schema written to schema_output_full.json');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkSchema();
