const { executeUpdate } = require('../models/db');
const sql = require('mssql');

const auditLogger = (req, res, next) => {
  // Only log write operations or specific important read operations if strictly needed
  // "without modifying... application" -> keep it minimally noisy
  // Debug: Check if middleware is hit
  // console.log(`AuditLogger MiddleWare Hit: ${req.method} ${req.url}`);

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    
    res.on('finish', async () => {
      // console.log(`AuditLogger Finish Event: ${req.method} ${req.url} Status: ${res.statusCode}`);
      try {

        // Skip logging 401/403 as they are auth failures (optional, but requested "operations performed")
        // If the user wasn't auth'd (401), req.user is undefined.
        // We log what we can.

        // Helper to get IP
        const getIp = (req) => {
             const xForwardedFor = req.headers['x-forwarded-for'];
             if (xForwardedFor) {
                 return xForwardedFor.split(',')[0].trim();
             }
             return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
        };

        const ipAddress = getIp(req);
        
        // Soft decode token if valid user isn't found (for routes without auth middleware)
        let user = req.user || {};
        const authHeader = req.headers['authorization']; // Safe access
        
        if (!user.id && authHeader) {
            try {
                const token = authHeader.replace('Bearer ', '');
                if (token) {
                    const jwt = require('jsonwebtoken'); 
                    const decoded = jwt.decode(token);
                    if (decoded) user = decoded; 
                }
            } catch (e) {
                console.error('AuditLogger Token Decode Error:', e.message);
            }
        }

        let userId = user.id || user.User_ID || null; // Match JWT payload 
        let userName = user.username || user.Username || 'Anonymous';

        // Login special case
        if (req.originalUrl.includes('/api/auth/login') && req.method === 'POST' && req.body?.username) {
            userName = req.body.username;
        }

        // Validate Integer for DB
        let userIdInt = null;
        if (userId) {
            const parsed = parseInt(userId, 10);
            if (!isNaN(parsed)) userIdInt = parsed;
        }

        // payload
        let payload = JSON.stringify(req.body);
        if (payload && payload.length > 2000) payload = payload.substring(0, 2000) + '...';
        
        if (payload.includes('password')) {
             const bodyObj = { ...req.body };
             delete bodyObj.password;
             payload = JSON.stringify(bodyObj);
        }

        // Debug before insert
        // console.log('AuditLogger Inserting:', { userIdInt, userName, endpoint: req.originalUrl, ipAddress });

        await executeUpdate(
          `INSERT INTO Audit_Logs (User_ID, User_Name, Action_Type, Endpoint, Resource_ID, Payload, Status_Code, IP_Address, Timestamp)
           VALUES (@param0, @param1, @param2, @param3, @param4, @param5, @param6, @param7, GETDATE())`,
          [
            { value: userIdInt, type: sql.Int }, 
            { value: userName, type: sql.NVarChar(100) },
            { value: req.method, type: sql.NVarChar(50) },
            { value: req.originalUrl, type: sql.NVarChar(255) },
            { value: resourceId ? String(resourceId) : null, type: sql.NVarChar(100) },
            { value: payload, type: sql.NVarChar(sql.MAX) },
            { value: res.statusCode, type: sql.Int },
            { value: ipAddress, type: sql.NVarChar(50) }
          ]
        );
      } catch (err) {
        console.error('Audit Logger Execution Error:', err); // Log full error object
      }
    });
  }
  next();
};

module.exports = auditLogger;
