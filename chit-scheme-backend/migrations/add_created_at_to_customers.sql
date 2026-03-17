-- Migration: Add Created_At column to Customer_Master for reliable insertion-order sorting
-- Run this once against your SQL Server database

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Customer_Master' AND COLUMN_NAME = 'Created_At'
)
BEGIN
    ALTER TABLE Customer_Master
    ADD Created_At DATETIME DEFAULT GETDATE();

    PRINT 'Added Created_At to Customer_Master';
END
ELSE
BEGIN
    PRINT 'Created_At already exists in Customer_Master';
END
