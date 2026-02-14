require('dotenv').config({ path: '../.env' }); // Load .env from root
const { executeQuery } = require('../models/db');

const checkIndexes = async () => {
  try {
    console.log('Checking indexes for Scheme_Due...');
    const dueIndexes = await executeQuery(`
      SELECT 
        TableName = t.name,
        IndexName = ind.name,
        ColumnName = col.name
      FROM 
        sys.indexes ind 
      INNER JOIN 
        sys.index_columns ic ON  ind.object_id = ic.object_id and ind.index_id = ic.index_id 
      INNER JOIN 
        sys.columns col ON ic.object_id = col.object_id and ic.column_id = col.column_id 
      INNER JOIN 
        sys.tables t ON ind.object_id = t.object_id 
      WHERE 
        t.name = 'Scheme_Due'
      ORDER BY 
        t.name, ind.name, ind.index_id, ic.index_column_id;
    `);
    console.log(JSON.stringify(dueIndexes, null, 2));

    console.log('Checking indexes for Scheme_Members...');
    const memberIndexes = await executeQuery(`
      SELECT 
        TableName = t.name,
        IndexName = ind.name,
        ColumnName = col.name
      FROM 
        sys.indexes ind 
      INNER JOIN 
        sys.index_columns ic ON  ind.object_id = ic.object_id and ind.index_id = ic.index_id 
      INNER JOIN 
        sys.columns col ON ic.object_id = col.object_id and ic.column_id = col.column_id 
      INNER JOIN 
        sys.tables t ON ind.object_id = t.object_id 
      WHERE 
        t.name = 'Scheme_Members'
      ORDER BY 
        t.name, ind.name, ind.index_id, ic.index_column_id;
    `);
    console.log(JSON.stringify(memberIndexes, null, 2));

  } catch (error) {
    console.error('Error checking indexes:', error);
  }
};

checkIndexes();
