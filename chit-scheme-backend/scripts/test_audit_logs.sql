-- ====================================================================
-- Test Query to Verify Audit Logs are Working
-- ====================================================================
-- Run this after making a few API calls to verify audit logging
-- ====================================================================

USE [VASANTHAMDB];
GO

-- Check if Audit_Logs table exists
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Audit_Logs')
BEGIN
    PRINT '✅ Audit_Logs table exists';
    
    -- Get total count
    SELECT COUNT(*) as 'Total Audit Records' FROM Audit_Logs;
    
    -- Show most recent 20 entries
    SELECT TOP 20 
        Log_ID,
        User_Name,
        Action_Type,
        Endpoint,
        Resource_ID,
        Status_Code,
        IP_Address,
        Timestamp
    FROM Audit_Logs
    ORDER BY Timestamp DESC;
    
    -- Group by Action Type
    SELECT 
        Action_Type,
        COUNT(*) as Count
    FROM Audit_Logs
    GROUP BY Action_Type
    ORDER BY Count DESC;
    
    -- Group by Endpoint
    SELECT 
        Endpoint,
        COUNT(*) as Count
    FROM Audit_Logs
    GROUP BY Endpoint
    ORDER BY Count DESC;
    
    -- Show today's activity
    SELECT 
        User_Name,
        Action_Type,
        Endpoint,
        Timestamp
    FROM Audit_Logs
    WHERE CAST(Timestamp AS DATE) = CAST(GETDATE() AS DATE)
    ORDER BY Timestamp DESC;
    
END
ELSE
BEGIN
    PRINT '❌ Audit_Logs table does NOT exist!';
    PRINT 'Run create_audit_table.sql or run_audit_migration.js first';
END
GO
