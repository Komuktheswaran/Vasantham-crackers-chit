const { executeQuery } = require('./models/db');

async function checkUniqueness() {
  try {
    const res = await executeQuery("SELECT COUNT(*) as total, COUNT(DISTINCT Membership_ID) as distinct_ids FROM Scheme_Members");
    console.log(JSON.stringify(res, null, 2));
    
    const pkCheck = await executeQuery(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_NAME = 'Scheme_Members'
    `);
    console.log('Existing Keys:', JSON.stringify(pkCheck, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkUniqueness();
