
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Audit_Logs')
BEGIN
    CREATE TABLE Audit_Logs (
        Log_ID INT IDENTITY(1,1) PRIMARY KEY,
        User_ID INT NULL,  -- Can be NULL if not authenticated or system action
        User_Name NVARCHAR(100) NULL,
        Action_Type NVARCHAR(50), -- POST, PUT, DELETE
        Endpoint NVARCHAR(255),
        Resource_ID NVARCHAR(100) NULL, -- ID if available in params
        Payload NVARCHAR(MAX) NULL, -- Request body (truncated if huge)
        Status_Code INT,
        IP_Address NVARCHAR(50),
        Timestamp DATETIME DEFAULT GETDATE()
    );
END
