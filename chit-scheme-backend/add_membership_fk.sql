-- 1. Add Membership_ID column to related tables
ALTER TABLE Scheme_Due
ADD Membership_ID INT NULL;
ALTER TABLE Payment_Master
ADD Membership_ID INT NULL;
-- 2. Backfill Membership_ID based on Fund_Number
-- This establishes the link for all existing records
UPDATE sd
SET sd.Membership_ID = sm.Membership_ID
FROM Scheme_Due sd
    JOIN Scheme_Members sm ON sd.Fund_Number = sm.Fund_Number;
UPDATE pm
SET pm.Membership_ID = sm.Membership_ID
FROM Payment_Master pm
    JOIN Scheme_Members sm ON pm.Fund_Number = sm.Fund_Number;
-- 3. Ensure Membership_ID is unique in Scheme_Members to allow it to be a target of a FK
-- My application code already ensures uniqueness, but SQL Server requires a constraint for FK targets
IF NOT EXISTS (
    SELECT *
    FROM sys.indexes
    WHERE name = 'UQ_Scheme_Members_Membership_ID'
) BEGIN
ALTER TABLE Scheme_Members
ADD CONSTRAINT UQ_Scheme_Members_Membership_ID UNIQUE (Membership_ID);
END -- 4. Add Foreign Key constraints
-- Note: We keep them NULLable for now to ensure compatibility if any data was missing during backfill
-- If you want absolute integrity, we can make them NOT NULL after verification.
ALTER TABLE Scheme_Due
ADD CONSTRAINT FK_Scheme_Due_Membership FOREIGN KEY (Membership_ID) REFERENCES Scheme_Members(Membership_ID);
ALTER TABLE Payment_Master
ADD CONSTRAINT FK_Payment_Master_Membership FOREIGN KEY (Membership_ID) REFERENCES Scheme_Members(Membership_ID);