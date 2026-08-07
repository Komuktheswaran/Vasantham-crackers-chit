const sql = require('mssql');
const fs = require('fs');
const path = require('path');
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

// ====================================================================
// Slow-query observability
// ====================================================================
// Any single query that takes longer than SLOW_QUERY_MS_THRESHOLD is logged
// to logs/slow-queries-YYYY-MM-DD.log AND emitted as a console warning.
// Threshold is configurable via env so it can be tuned without redeploying.
const SLOW_QUERY_MS_THRESHOLD = parseInt(process.env.SLOW_QUERY_MS, 10) || 500;
const slowQueryLogsDir = path.join(__dirname, '..', 'logs');
try {
  if (!fs.existsSync(slowQueryLogsDir)) fs.mkdirSync(slowQueryLogsDir, { recursive: true });
} catch (_) { /* logs are best-effort; never fail a query */ }

const logSlowQuery = (label, query, durationMs, paramCount, error) => {
  // Truncate the query so a multi-thousand-line bulk INSERT doesn't bloat the log
  const truncated = query.length > 800 ? query.slice(0, 800) + ' …[truncated]' : query;
  const tag = error ? '❌ ERROR' : '🐢 SLOW';
  const line = `[${new Date().toISOString()}] ${tag} ${label} ${durationMs}ms params=${paramCount}${error ? ` err=${error.message}` : ''} | ${truncated.replace(/\s+/g, ' ')}\n`;
  if (error) console.error(`[db] ${tag} ${label} ${durationMs}ms — ${error.message}`);
  else console.warn(`[db] ${tag} ${label} ${durationMs}ms`);
  try {
    const file = path.join(slowQueryLogsDir, `slow-queries-${new Date().toISOString().slice(0, 10)}.log`);
    fs.appendFile(file, line, () => {});
  } catch (_) { /* swallow — must never break the request */ }
};

const bindParams = (request, params) => {
  if (!params) return;
  params.forEach((param, index) => {
    const paramName = param.name || `param${index}`;
    request.input(paramName, param.type, param.value);
  });
};

const timed = async (label, query, params, fn) => {
  const start = Date.now();
  try {
    const result = await fn();
    const dur = Date.now() - start;
    if (dur >= SLOW_QUERY_MS_THRESHOLD) {
      logSlowQuery(label, query, dur, params ? params.length : 0, null);
    }
    return result;
  } catch (error) {
    const dur = Date.now() - start;
    // Always log query errors with their text — easiest single signal for debugging
    logSlowQuery(label, query, dur, params ? params.length : 0, error);
    throw error;
  }
};

const executeQuery = async (query, params = []) => {
  const pool = await getPool();
  return timed('SELECT', query, params, async () => {
    const request = pool.request();
    bindParams(request, params);
    const result = await request.query(query);
    return result.recordset;
  });
};

const executeInsertGetId = async (query, params = []) => {
  const pool = await getPool();
  return timed('INSERT', query, params, async () => {
    const request = pool.request();
    bindParams(request, params);
    const result = await request.query(query);
    return result.recordset && result.recordset.length > 0 ? result.recordset[0] : null;
  });
};

const executeUpdate = async (query, params = []) => {
  const pool = await getPool();
  return timed('UPDATE', query, params, async () => {
    const request = pool.request();
    bindParams(request, params);
    await request.query(query);
    return { success: true };
  });
};

module.exports = { executeQuery, executeInsertGetId, executeUpdate, getPool };
