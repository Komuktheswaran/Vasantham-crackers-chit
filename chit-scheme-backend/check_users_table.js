const { executeQuery } = require('./models/db');

const inspect = async () => {
  try {
    console.log('--- Users Table Columns ---');
    const usersCols = await executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Users'
      ORDER BY ORDINAL_POSITION
    `);
    console.table(usersCols);

  } catch (error) {
    console.error(error);
  }
};

inspect();
