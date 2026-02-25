-- ============================================================
-- MEMBERSHIP_ID FULL MIGRATION
-- Adds Membership_ID (FK to Scheme_Members) to:
--   Auctions, Scheme_Due, Payment_Master
-- Idempotent: safe to run multiple times.
-- ============================================================
-- -------------------------------------------------------
-- 1. SCHEME_DUE  -- add column + FK if not already present
-- -------------------------------------------------------
IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Scheme_Due')
        AND name = 'Membership_ID'
) BEGIN
ALTER TABLE dbo.Scheme_Due
ADD Membership_ID INT NULL;
PRINT 'Added Membership_ID column to Scheme_Due.';
END
ELSE PRINT 'Scheme_Due.Membership_ID already exists — skipped.';
IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_Scheme_Due_Membership'
) BEGIN
ALTER TABLE dbo.Scheme_Due
ADD CONSTRAINT FK_Scheme_Due_Membership FOREIGN KEY (Membership_ID) REFERENCES dbo.Scheme_Members(Membership_ID);
PRINT 'Added FK_Scheme_Due_Membership.';
END
ELSE PRINT 'FK_Scheme_Due_Membership already exists — skipped.';
-- -------------------------------------------------------
-- 2. PAYMENT_MASTER  -- add column + FK if not already present
-- -------------------------------------------------------
IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Payment_Master')
        AND name = 'Membership_ID'
) BEGIN
ALTER TABLE dbo.Payment_Master
ADD Membership_ID INT NULL;
PRINT 'Added Membership_ID column to Payment_Master.';
END
ELSE PRINT 'Payment_Master.Membership_ID already exists — skipped.';
IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_Payment_Master_Membership'
) BEGIN
ALTER TABLE dbo.Payment_Master
ADD CONSTRAINT FK_Payment_Master_Membership FOREIGN KEY (Membership_ID) REFERENCES dbo.Scheme_Members(Membership_ID);
PRINT 'Added FK_Payment_Master_Membership.';
END
ELSE PRINT 'FK_Payment_Master_Membership already exists — skipped.';
-- -------------------------------------------------------
-- 3. AUCTIONS  -- add column + FK if not already present
-- -------------------------------------------------------
IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Auctions')
        AND name = 'Membership_ID'
) BEGIN
ALTER TABLE dbo.Auctions
ADD Membership_ID INT NULL;
PRINT 'Added Membership_ID column to Auctions.';
END
ELSE PRINT 'Auctions.Membership_ID already exists — skipped.';
IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_Auctions_Membership'
) BEGIN
ALTER TABLE dbo.Auctions
ADD CONSTRAINT FK_Auctions_Membership FOREIGN KEY (Membership_ID) REFERENCES dbo.Scheme_Members(Membership_ID);
PRINT 'Added FK_Auctions_Membership.';
END
ELSE PRINT 'FK_Auctions_Membership already exists — skipped.';
-- -------------------------------------------------------
-- 4. BACKFILL EXISTING DATA via Fund_Number
-- -------------------------------------------------------
-- 4a. Scheme_Due  (join on Fund_Number)
UPDATE sd
SET sd.Membership_ID = sm.Membership_ID
FROM dbo.Scheme_Due AS sd
    JOIN dbo.Scheme_Members AS sm ON sd.Fund_Number = sm.Fund_Number
    AND sd.Scheme_ID = sm.Scheme_ID
    AND sd.Customer_ID = sm.Customer_ID
WHERE sd.Membership_ID IS NULL;
PRINT CAST(@@ROWCOUNT AS VARCHAR) + ' Scheme_Due rows backfilled.';
-- 4b. Payment_Master  (join on Fund_Number)
UPDATE pm
SET pm.Membership_ID = sm.Membership_ID
FROM dbo.Payment_Master AS pm
    JOIN dbo.Scheme_Members AS sm ON pm.Fund_Number = sm.Fund_Number
    AND pm.Scheme_ID = sm.Scheme_ID
    AND pm.Customer_ID = sm.Customer_ID
WHERE pm.Membership_ID IS NULL;
PRINT CAST(@@ROWCOUNT AS VARCHAR) + ' Payment_Master rows backfilled.';
-- 4c. Auctions  (a customer can only be in one scheme at a time per business rules)
UPDATE a
SET a.Membership_ID = sm.Membership_ID
FROM dbo.Auctions AS a
    JOIN dbo.Scheme_Members AS sm ON a.Customer_ID = sm.Customer_ID
WHERE a.Membership_ID IS NULL;
PRINT CAST(@@ROWCOUNT AS VARCHAR) + ' Auctions rows backfilled.';
PRINT 'Migration complete.';