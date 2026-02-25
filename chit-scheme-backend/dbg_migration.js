const { executeQuery } = require('./models/db');

async function checkColumns() {
  try {
    console.log('--- Membership_ID Column Details ---');
    const types = await executeQuery(`
        SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE COLUMN_NAME = 'Membership_ID'
    `);
    console.dir(types, { depth: null });

    console.log('\n--- Scheme_Members Existing Data Stats ---');
    const stats = await executeQuery(`
        SELECT COUNT(*) as total_rows, COUNT(Membership_ID) as non_null_ids, COUNT(DISTINCT Membership_ID) as distinct_ids
        FROM Scheme_Members
    `);
    console.dir(stats, { depth: null });

    console.log('\n--- Constraints Check ---');
    const constraints = await executeQuery(`
        SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_NAME IN ('FK_Scheme_Due_Membership', 'FK_Payment_Master_Membership', 'UQ_Scheme_Members_Membership_ID')
    `);
    console.dir(constraints, { depth: null });

  } catch (err) {
    console.error('Diagnostic failed:', err);
  } finally {
    process.exit();
  }
}

checkColumns();
