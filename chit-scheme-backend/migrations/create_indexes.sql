-- Migration: Create missing indexes for high-traffic query patterns
-- Run once against VASANTHAMDBLIVE. All CREATE INDEX statements are safe to re-run (IF NOT EXISTS guard).

-- Customer_Master: fast lookup by ID (used in every single-record fetch and LIKE prefix scan for ID generation)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Customer_Master_Customer_ID' AND object_id = OBJECT_ID('Customer_Master'))
  CREATE INDEX IX_Customer_Master_Customer_ID ON Customer_Master (Customer_ID);

-- Customer_Master: fast sort by creation time (default list sort)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Customer_Master_Created_At' AND object_id = OBJECT_ID('Customer_Master'))
  CREATE INDEX IX_Customer_Master_Created_At ON Customer_Master (Created_At DESC);

-- Customer_Master: phone number search (CAST(Phone_Number AS VARCHAR) LIKE ...)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Customer_Master_Phone_Number' AND object_id = OBJECT_ID('Customer_Master'))
  CREATE INDEX IX_Customer_Master_Phone_Number ON Customer_Master (Phone_Number);

-- Scheme_Members: used in aggregated JOIN for total_schemes count per customer
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Scheme_Members_Customer_ID' AND object_id = OBJECT_ID('Scheme_Members'))
  CREATE INDEX IX_Scheme_Members_Customer_ID ON Scheme_Members (Customer_ID);

-- Scheme_Members: fast Fund_Number LIKE prefix scan for ID generation (UPDLOCK SELECT)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Scheme_Members_Fund_Number' AND object_id = OBJECT_ID('Scheme_Members'))
  CREATE INDEX IX_Scheme_Members_Fund_Number ON Scheme_Members (Fund_Number);

-- Payment_Master: used in aggregated JOIN for total_payments count per customer
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Payment_Master_Customer_ID' AND object_id = OBJECT_ID('Payment_Master'))
  CREATE INDEX IX_Payment_Master_Customer_ID ON Payment_Master (Customer_ID);

-- Scheme_Due: composite index for delete-by-customer+scheme (removeScheme, deleteCustomer)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Scheme_Due_Customer_Scheme' AND object_id = OBJECT_ID('Scheme_Due'))
  CREATE INDEX IX_Scheme_Due_Customer_Scheme ON Scheme_Due (Customer_ID, Scheme_ID);

-- Scheme_Due: composite index for bulk-insert lookup (Fund_Number + Customer_ID)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Scheme_Due_Fund_Customer' AND object_id = OBJECT_ID('Scheme_Due'))
  CREATE INDEX IX_Scheme_Due_Fund_Customer ON Scheme_Due (Fund_Number, Customer_ID);

PRINT 'Index migration complete.';
