const sql = require('mssql');
const { executeQuery } = require('../models/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// GET /api/audit-logs?page=&limit=&user=&endpoint=&method=&status=&ip=&date_from=&date_to=
// Admin-only — guarded by requireAdmin at the route level.
const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      user,
      endpoint,
      method,
      status,
      ip,
      date_from,
      date_to,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * pageSize;

    const where = [];
    const params = [];
    let i = 0;

    if (user) {
      where.push(`User_Name LIKE @param${i}`);
      params.push({ value: `%${user}%`, type: sql.NVarChar(100) });
      i++;
    }
    if (endpoint) {
      where.push(`Endpoint LIKE @param${i}`);
      params.push({ value: `%${endpoint}%`, type: sql.NVarChar(255) });
      i++;
    }
    if (method) {
      where.push(`Action_Type = @param${i}`);
      params.push({ value: String(method).toUpperCase(), type: sql.NVarChar(50) });
      i++;
    }
    if (status) {
      const parsed = parseInt(status, 10);
      if (!isNaN(parsed)) {
        where.push(`Status_Code = @param${i}`);
        params.push({ value: parsed, type: sql.Int });
        i++;
      }
    }
    if (ip) {
      where.push(`IP_Address LIKE @param${i}`);
      params.push({ value: `%${ip}%`, type: sql.NVarChar(50) });
      i++;
    }
    if (date_from) {
      where.push(`Timestamp >= @param${i}`);
      params.push({ value: date_from, type: sql.DateTime2 });
      i++;
    }
    if (date_to) {
      where.push(`Timestamp <= @param${i}`);
      params.push({ value: date_to, type: sql.DateTime2 });
      i++;
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // SELECT * so we don't hardcode the PK column name (varies by environment)
    const listQuery = `
      SELECT *
      FROM Audit_Logs
      ${whereClause}
      ORDER BY Timestamp DESC
      OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
    `;

    const countQuery = `SELECT COUNT(*) AS total FROM Audit_Logs ${whereClause}`;

    const [rows, totalRes] = await Promise.all([
      executeQuery(listQuery, params),
      executeQuery(countQuery, params),
    ]);

    const total = totalRes[0]?.total || 0;
    return sendSuccess(res, 'Audit logs fetched', {
      logs: rows,
      pagination: {
        totalRecords: total,
        totalPages: Math.ceil(total / pageSize),
        currentPage: pageNum,
        pageSize,
      },
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch audit logs', error);
  }
};

module.exports = { getAuditLogs };
