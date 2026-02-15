-- SQL Script to fix missing columns in Customer_Master and Order_Tracking
-- Run this on your SQL Server Management Studio (SSMS) against the VASANTHAMDBLIVE database.
USE VASANTHAMDBLIVE;
GO -- 1. Add missing columns to Customer_Master
    IF NOT EXISTS (
        SELECT *
        FROM sys.columns
        WHERE object_id = OBJECT_ID('Customer_Master')
            AND name = 'Reference_Phone'
    ) BEGIN
ALTER TABLE Customer_Master
ADD Reference_Phone VARCHAR(50);
PRINT 'Added Reference_Phone to Customer_Master';
END
ELSE BEGIN PRINT 'Reference_Phone already exists in Customer_Master';
END IF NOT EXISTS (
    SELECT *
    FROM sys.columns
    WHERE object_id = OBJECT_ID('Customer_Master')
        AND name = 'Delivery_Point_ID'
) BEGIN
ALTER TABLE Customer_Master
ADD Delivery_Point_ID INT;
PRINT 'Added Delivery_Point_ID to Customer_Master';
END
ELSE BEGIN PRINT 'Delivery_Point_ID already exists in Customer_Master';
END -- 2. Add missing columns to Order_Tracking
IF NOT EXISTS (
    SELECT *
    FROM sys.columns
    WHERE object_id = OBJECT_ID('Order_Tracking')
        AND name = 'Customer_Name'
) BEGIN
ALTER TABLE Order_Tracking
ADD Customer_Name VARCHAR(255);
PRINT 'Added Customer_Name to Order_Tracking';
END
ELSE BEGIN PRINT 'Customer_Name already exists in Order_Tracking';
END -- 3. Verify changes
SELECT COLUMN_NAME,
    DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('Customer_Master', 'Order_Tracking')
    AND COLUMN_NAME IN (
        'Reference_Phone',
        'Delivery_Point_ID',
        'Customer_Name'
    );
GO