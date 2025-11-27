const sql = require('mssql');
const { dbConfig } = require('../config/database');

let pool;

const getPool = async () => {
  if (!pool) {
    pool = await sql.connect(dbConfig);
  }
  return pool;
};

const executeQuery = async (query, params) => {
  const connection = await sql.connect(dbConfig);  // ✅ Fresh connection EVERY time
  const request = connection.request();  // ✅ Always works
  const result = await request.query(query);
  await connection.close();  // ✅ Clean up
  return result.recordset;
};

const executeInsertGetId = async (query, params = []) => {
  const pool = await getPool();
  try {
    const request = pool.request();
    params.forEach((param, index) => {
      request.input(`param${index}`, param.type, param.value);
    });
    const result = await request.query(query);
    return result.recordset[0];
  } catch (error) {
    console.error('❌ Insert Error:', error);
    throw error;
  }
};

const executeUpdate = async (query, params = []) => {
  const pool = await getPool();
  try {
    const request = pool.request();
    params.forEach((param, index) => {
      request.input(`param${index}`, param.type, param.value);
    });
    await request.query(query);
    return { success: true };
  } catch (error) {
    throw error;
  }
};

module.exports = { executeQuery, executeInsertGetId, executeUpdate };
