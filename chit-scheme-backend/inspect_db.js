const { executeQuery } = require('./models/db');

const inspect = async () => {
  try {
    console.log('--- Scheme_Members Columns ---');
    const membersCols = await executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Scheme_Members'
    `);
    console.table(membersCols);

    console.log('--- Scheme_Due Columns ---');
    const dueCols = await executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Scheme_Due'
    `);
    console.table(dueCols);

  } catch (error) {
    console.error(error);
  }
};

inspect();
