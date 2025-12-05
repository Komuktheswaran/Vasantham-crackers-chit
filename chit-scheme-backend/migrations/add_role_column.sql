-- Migration: Add Role column to Users table for role-based access control
-- Date: 2025-12-04
-- Description: Adds a Role column with default value 'user' and check constraint

-- Add Role column to Users table
ALTER TABLE Users
ADD Role VARCHAR(20) DEFAULT 'user' NOT NULL;

-- Add check constraint to ensure only valid roles are allowed
ALTER TABLE Users
ADD CONSTRAINT CK_Users_Role CHECK (Role IN ('admin', 'user'));

-- Update existing users (you may want to manually assign admin role to specific users)
-- Example: UPDATE Users SET Role = 'admin' WHERE Username = 'admin';

-- View the updated table structure
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Users'
ORDER BY ORDINAL_POSITION;
