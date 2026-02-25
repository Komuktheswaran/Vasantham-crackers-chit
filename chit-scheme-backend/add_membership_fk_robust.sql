-- 1. Add Membership_ID column to related tables if not exists
IF NOT EXISTS (
    SELECT *
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Scheme_Due'
        AND COLUMN_NAME = 'Membership_ID'
) BEGIN
ALTER TABLE Scheme_Due
ADD Membership_ID INT NULL;
END IF NOT EXISTS (
    SELECT *
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Payment_Master'
        AND COLUMN_NAME = 'Membership_ID'
) BEGIN
ALTER TABLE Payment_Master
ADD Membership_ID INT NULL;
END -- 2. Backfill Membership_ID based on Fund_Number
UPDATE sd
SET sd.Membership_ID = sm.Membership_ID
FROM Scheme_Due sd
    JOIN Scheme_Members sm ON sd.Fund_Number = sm.Fund_Number
WHERE sd.Membership_ID IS NULL;
UPDATE pm
SET pm.Membership_ID = sm.Membership_ID
FROM Payment_Master pm
    JOIN Scheme_Members sm ON pm.Fund_Number = sm.Fund_Number
WHERE pm.Membership_ID IS NULL;
-- 3. Ensure Membership_ID is unique in Scheme_Members
IF NOT EXISTS (
    SELECT *
    FROM sys.objects
    WHERE name = 'UQ_Scheme_Members_Membership_ID'
        AND type = 'UQ'
) BEGIN
ALTER TABLE Scheme_Members
ADD CONSTRAINT UQ_Scheme_Members_Membership_ID UNIQUE (Membership_ID);
END -- 4. Add Foreign Key constraints if not exists
IF NOT EXISTS (
    SELECT *
    FROM sys.objects
    WHERE name = 'FK_Scheme_Due_Membership'
        AND type = 'F'
) BEGIN
ALTER TABLE Scheme_Due
ADD CONSTRAINT FK_Scheme_Due_Membership FOREIGN KEY (Membership_ID) REFERENCES Scheme_Members(Membership_ID);
END IF NOT EXISTS (
    SELECT *
    FROM sys.objects
    WHERE name = 'FK_Payment_Master_Membership'
        AND type = 'F'
) BEGIN
ALTER TABLE Payment_Master
ADD CONSTRAINT FK_Payment_Master_Membership FOREIGN KEY (Membership_ID) REFERENCES Scheme_Members(Membership_ID);
END