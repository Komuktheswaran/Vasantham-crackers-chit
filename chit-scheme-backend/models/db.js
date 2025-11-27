const sql = require('mssql');
const { dbConfig } = require('../config/database');

let pool;

const getPool = async () => {
  if (!pool) {
    pool = await sql.connect(dbConfig);
  }
  return pool;
};

const executeQuery = async (query, params = []) => {
  const connection = await sql.connect(dbConfig);  // ✅ Fresh connection EVERY time
  const request = connection.request();  // ✅ Always works
  
  if (params) {
    params.forEach((param, index) => {
      const paramName = param.name || `param${index}`;
      request.input(paramName, param.type, param.value);
    });
  }

  const result = await request.query(query);
  await connection.close();  // ✅ Clean up
  return result.recordset;
};

const executeInsertGetId = async (query, params = []) => {
  const connection = await sql.connect(dbConfig);
  try {
    const request = connection.request();
    if (params) {
      params.forEach((param, index) => {
        const paramName = param.name || `param${index}`;
        request.input(paramName, param.type, param.value);
      });
    }
    const result = await request.query(query);
    await connection.close();
    return result.recordset[0];
  } catch (error) {
    await connection.close();
    console.error('❌ Insert Error:', error);
    throw error;
  }
};

const executeUpdate = async (query, params = []) => {
  const connection = await sql.connect(dbConfig);
  try {
    const request = connection.request();
    if (params) {
      params.forEach((param, index) => {
        const paramName = param.name || `param${index}`;
        request.input(paramName, param.type, param.value);
      });
    }
    await request.query(query);
    await connection.close();
    return { success: true };
  } catch (error) {
    await connection.close();
    throw error;
  }
};

module.exports = { executeQuery, executeInsertGetId, executeUpdate };
