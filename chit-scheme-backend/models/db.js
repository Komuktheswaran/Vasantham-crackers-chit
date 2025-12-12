const sql = require('mssql');
const { dbConfig } = require('../config/database');

let pool;

const getPool = async () => {
  if (pool) return pool;
  try {
    pool = await new sql.ConnectionPool(dbConfig).connect();
    pool.on('error', err => {
      console.error('❌ Database Pool Error:', err);
      pool = null; // Reset pool on error so next request tries to reconnect
    });
    return pool;
  } catch (err) {
    console.error('❌ Failed to create connection pool:', err);
    throw err;
  }
};

const executeQuery = async (query, params = []) => {
  const pool = await getPool();
  const request = pool.request();
  
  if (params) {
    params.forEach((param, index) => {
      const paramName = param.name || `param${index}`;
      request.input(paramName, param.type, param.value);
    });
  }

  const result = await request.query(query);
  return result.recordset;
};

const executeInsertGetId = async (query, params = []) => {
  const pool = await getPool();
  try {
    const request = pool.request();
    if (params) {
      params.forEach((param, index) => {
        const paramName = param.name || `param${index}`;
        request.input(paramName, param.type, param.value);
      });
    }
    const result = await request.query(query);
    // return result.recordset[0]; // Logic depends on query having OUTPUT or similar, assuming original logic was correct about recordset[0]
     return result.recordset && result.recordset.length > 0 ? result.recordset[0] : null;
  } catch (error) {
    console.error('❌ Insert Error:', error);
    throw error;
  }
};

const executeUpdate = async (query, params = []) => {
  const pool = await getPool();
  try {
    const request = pool.request();
    if (params) {
      params.forEach((param, index) => {
        const paramName = param.name || `param${index}`;
        request.input(paramName, param.type, param.value);
      });
    }
    await request.query(query);
    return { success: true };
  } catch (error) {
    throw error;
  }
};

module.exports = { executeQuery, executeInsertGetId, executeUpdate, getPool };
