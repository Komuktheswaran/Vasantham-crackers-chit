-- ====================================================================
-- SQL Script to Insert 100 Records - WITH CUSTOMER CREATION
-- ====================================================================
-- Database: Chit Scheme Management System
-- This script first creates 100 customers, then schemes, then members
-- ====================================================================

USE [VASANTHAMDB];
GO

-- ====================================================================
-- STEP 1: Create 100 Customers (if they don't exist)
-- ====================================================================
PRINT 'Creating 100 customers...';
GO

-- Insert customers with proper structure
INSERT INTO Customer_Master (Customer_ID, Name, Phone_Number, Area, State_ID, District_ID, Customer_Type, Address1)
SELECT * FROM (VALUES
    ('CUST_001', 'Rajesh Kumar', 9876543210, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 1'),
    ('CUST_002', 'Priya Sharma', 9876543211, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 2'),
    ('CUST_003', 'Amit Patel', 9876543212, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 3'),
    ('CUST_004', 'Sneha Reddy', 9876543213, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 4'),
    ('CUST_005', 'Vijay Singh', 9876543214, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 5'),
    ('CUST_006', 'Lakshmi Iyer', 9876543215, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 6'),
    ('CUST_007', 'Ravi Chandran', 9876543216, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 7'),
    ('CUST_008', 'Meena Krishnan', 9876543217, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 8'),
    ('CUST_009', 'Karthik Mohan', 9876543218, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 9'),
    ('CUST_010', 'Divya Nair', 9876543219, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 10'),
    ('CUST_011', 'Suresh Babu', 9876543220, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 11'),
    ('CUST_012', 'Anitha Raj', 9876543221, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 12'),
    ('CUST_013', 'Ganesh Kumar', 9876543222, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 13'),
    ('CUST_014', 'Kavitha Murthy', 9876543223, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 14'),
    ('CUST_015', 'Prakash Verma', 9876543224, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 15'),
    ('CUST_016', 'Revathi Subramanian', 9876543225, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 16'),
    ('CUST_017', 'Arun Kumar', 9876543226, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 17'),
    ('CUST_018', 'Deepa Raman', 9876543227, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 18'),
    ('CUST_019', 'Murali Krishna', 9876543228, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 19'),
    ('CUST_020', 'Harini Gopal', 9876543229, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 20'),
    ('CUST_021', 'Senthil Nathan', 9876543230, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 21'),
    ('CUST_022', 'Vani Prasad', 9876543231, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 22'),
    ('CUST_023', 'Bala Krishnan', 9876543232, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 23'),
    ('CUST_024', 'Radha Venkat', 9876543233, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 24'),
    ('CUST_025', 'Kumar Swamy', 9876543234, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 25'),
    ('CUST_026', 'Geetha Ramesh', 9876543235, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 26'),
    ('CUST_027', 'Ramesh Babu', 9876543236, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 27'),
    ('CUST_028', 'Saranya Kumar', 9876543237, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 28'),
    ('CUST_029', 'Dinesh Raja', 9876543238, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 29'),
    ('CUST_030', 'Pooja Singh', 9876543239, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 30'),
    ('CUST_031', 'Naveen Kumar', 9876543240, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 31'),
    ('CUST_032', 'Shanti Devi', 9876543241, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 32'),
    ('CUST_033', 'Mohan Lal', 9876543242, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 33'),
    ('CUST_034', 'Indira Gandhi', 9876543243, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 34'),
    ('CUST_035', 'Chandran Nair', 9876543244, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 35'),
    ('CUST_036', 'Mangala Devi', 9876543245, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 36'),
    ('CUST_037', 'Selvam Raja', 9876543246, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 37'),
    ('CUST_038', 'Bharathi Kumar', 9876543247, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 38'),
    ('CUST_039', 'Muthu Kumar', 9876543248, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 39'),
    ('CUST_040', 'Chitra Lakshmi', 9876543249, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 40'),
    ('CUST_041', 'Thirumalai Raj', 9876543250, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 41'),
    ('CUST_042', 'Varalakshmi Devi', 9876543251, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 42'),
    ('CUST_043', 'Saravanan Kumar', 9876543252, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 43'),
    ('CUST_044', 'Usha Rani', 9876543253, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 44'),
    ('CUST_045', 'Parthiban Mohan', 9876543254, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 45'),
    ('CUST_046', 'Suganya Priya', 9876543255, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 46'),
    ('CUST_047', 'Ilango Kumar', 9876543256, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 47'),
    ('CUST_048', 'Padma Shree', 9876543257, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 48'),
    ('CUST_049', 'Jagadish Babu', 9876543258, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 49'),
    ('CUST_050', 'Renuka Devi', 9876543259, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 50'),
    ('CUST_051', 'Manoj Kumar', 9876543260, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 51'),
    ('CUST_052', 'Kamala Devi', 9876543261, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 52'),
    ('CUST_053', 'Ramachandran Pillai', 9876543262, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 53'),
    ('CUST_054', 'Sumathi Bai', 9876543263, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 54'),
    ('CUST_055', 'Balaji Raja', 9876543264, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 55'),
    ('CUST_056', 'Shobana Kumari', 9876543265, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 56'),
    ('CUST_057', 'Pandian Kumar', 9876543266, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 57'),
    ('CUST_058', 'Mythili Devi', 9876543267, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 58'),
    ('CUST_059', 'Nandakumar Raja', 9876543268, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 59'),
    ('CUST_060', 'Ambika Devi', 9876543269, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 60'),
    ('CUST_061', 'Govindan Nair', 9876543270, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 61'),
    ('CUST_062', 'Sujatha Menon', 9876543271, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 62'),
    ('CUST_063', 'Krishnamurthy Iyer', 9876543272, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 63'),
    ('CUST_064', 'Devaki Amma', 9876543273, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 64'),
    ('CUST_065', 'Subramanian Pillai', 9876543274, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 65'),
    ('CUST_066', 'Janaki Bai', 9876543275, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 66'),
    ('CUST_067', 'Venkatesh Rao', 9876543276, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 67'),
    ('CUST_068', 'Parvathi Devi', 9876543277, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 68'),
    ('CUST_069', 'Raghavan Nair', 9876543278, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 69'),
    ('CUST_070', 'Saraswathi Bai', 9876543279, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 70'),
    ('CUST_071', 'Anandan Kumar', 9876543280, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 71'),
    ('CUST_072', 'Vasantha Kumari', 9876543281, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 72'),
    ('CUST_073', 'Sivaraj Mohan', 9876543282, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 73'),
    ('CUST_074', 'Rukmani Devi', 9876543283, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 74'),
    ('CUST_075', 'Natarajan Pillai', 9876543284, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 75'),
    ('CUST_076', 'Durga Devi', 9876543285, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 76'),
    ('CUST_077', 'Viswanathan Iyer', 9876543286, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 77'),
    ('CUST_078', 'Kalyani Bai', 9876543287, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 78'),
    ('CUST_079', 'Palani Kumar', 9876543288, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 79'),
    ('CUST_080', 'Alamelu Manga', 9876543289, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 80'),
    ('CUST_081', 'Sundaram Raja', 9876543290, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 81'),
    ('CUST_082', 'Lalitha Devi', 9876543291, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 82'),
    ('CUST_083', 'Murugan Ayya', 9876543292, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 83'),
    ('CUST_084', 'Seetha Devi', 9876543293, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 84'),
    ('CUST_085', 'Karuppan Thevar', 9876543294, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 85'),
    ('CUST_086', 'Andal Ammal', 9876543295, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 86'),
    ('CUST_087', 'Perumal Chettiar', 9876543296, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 87'),
    ('CUST_088', 'Nagamma Devi', 9876543297, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 88'),
    ('CUST_089', 'Velmurugan Raja', 9876543298, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 89'),
    ('CUST_090', 'Thangam Bai', 9876543299, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 90'),
    ('CUST_091', 'Arumugam Pillai', 9876543300, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 91'),
    ('CUST_092', 'Ponnammal Amma', 9876543301, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 92'),
    ('CUST_093', 'Ayyanar Thevar', 9876543302, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 93'),
    ('CUST_094', 'Mariammal Devi', 9876543303, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 94'),
    ('CUST_095', 'Selvaraj Nadar', 9876543304, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 95'),
    ('CUST_096', 'Chellamma Bai', 9876543305, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 96'),
    ('CUST_097', 'Muthusamy Raja', 9876543306, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 97'),
    ('CUST_098', 'Kannamma Devi', 9876543307, 'Virudhunagar', 1, 1, 'Fund Scheme', 'Street 98'),
    ('CUST_099', 'Palanisamy Gounder', 9876543308, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 99'),
    ('CUST_100', 'Valli Ammal', 9876543309, 'Sivakasi', 1, 1, 'Fund Scheme', 'Street 100')
) AS temp(Customer_ID, Name, Phone_Number, Area, State_ID, District_ID, Customer_Type, Address1)
WHERE NOT EXISTS (SELECT 1 FROM Customer_Master WHERE Customer_Master.Customer_ID = temp.Customer_ID);

PRINT 'Customers created successfully!';
GO

-- ====================================================================
-- STEP 2: Insert 100 Schemes into Chit_Master
-- ====================================================================
PRINT 'Inserting 100 records into Chit_Master...';
GO

INSERT INTO Chit_Master (Name, Total_Amount, Amount_per_month, Period, Number_of_due, Month_from, Month_to)
VALUES 
('Scheme-001', 100000.00, 5000.00, 20, 20, '2024-01-01', '2025-08-01'),
('Scheme-002', 150000.00, 7500.00, 20, 20, '2024-01-01', '2025-08-01'),
('Scheme-003', 200000.00, 10000.00, 20, 20, '2024-02-01', '2025-09-01'),
('Scheme-004', 50000.00, 2500.00, 20, 20, '2024-02-01', '2025-09-01'),
('Scheme-005', 75000.00, 3750.00, 20, 20, '2024-03-01', '2025-10-01'),
('Scheme-006', 120000.00, 6000.00, 20, 20, '2024-03-01', '2025-10-01'),
('Scheme-007', 180000.00, 9000.00, 20, 20, '2024-04-01', '2025-11-01'),
('Scheme-008', 250000.00, 12500.00, 20, 20, '2024-04-01', '2025-11-01'),
('Scheme-009', 90000.00, 4500.00, 20, 20, '2024-05-01', '2025-12-01'),
('Scheme-010', 110000.00, 5500.00, 20, 20, '2024-05-01', '2025-12-01'),
('Scheme-011', 300000.00, 15000.00, 20, 20, '2024-06-01', '2026-01-01'),
('Scheme-012', 85000.00, 4250.00, 20, 20, '2024-06-01', '2026-01-01'),
('Scheme-013', 95000.00, 4750.00, 20, 20, '2024-07-01', '2026-02-01'),
('Scheme-014', 130000.00, 6500.00, 20, 20, '2024-07-01', '2026-02-01'),
('Scheme-015', 160000.00, 8000.00, 20, 20, '2024-08-01', '2026-03-01'),
('Scheme-016', 70000.00, 3500.00, 20, 20, '2024-08-01', '2026-03-01'),
('Scheme-017', 105000.00, 5250.00, 20, 20, '2024-09-01', '2026-04-01'),
('Scheme-018', 115000.00, 5750.00, 20, 20, '2024-09-01', '2026-04-01'),
('Scheme-019', 140000.00, 7000.00, 20, 20, '2024-10-01', '2026-05-01'),
('Scheme-020', 170000.00, 8500.00, 20, 20, '2024-10-01', '2026-05-01'),
('Scheme-021', 190000.00, 9500.00, 20, 20, '2024-11-01', '2026-06-01'),
('Scheme-022', 220000.00, 11000.00, 20, 20, '2024-11-01', '2026-06-01'),
('Scheme-023', 240000.00, 12000.00, 20, 20, '2024-12-01', '2026-07-01'),
('Scheme-024', 60000.00, 3000.00, 20, 20, '2024-12-01', '2026-07-01'),
('Scheme-025', 80000.00, 4000.00, 20, 20, '2025-01-01', '2026-08-01'),
('Scheme-026', 125000.00, 6250.00, 20, 20, '2025-01-01', '2026-08-01'),
('Scheme-027', 135000.00, 6750.00, 20, 20, '2025-02-01', '2026-09-01'),
('Scheme-028', 145000.00, 7250.00, 20, 20, '2025-02-01', '2026-09-01'),
('Scheme-029', 155000.00, 7750.00, 20, 20, '2025-03-01', '2026-10-01'),
('Scheme-030', 165000.00, 8250.00, 20, 20, '2025-03-01', '2026-10-01'),
('Scheme-031', 175000.00, 8750.00, 20, 20, '2025-04-01', '2026-11-01'),
('Scheme-032', 185000.00, 9250.00, 20, 20, '2025-04-01', '2026-11-01'),
('Scheme-033', 195000.00, 9750.00, 20, 20, '2025-05-01', '2026-12-01'),
('Scheme-034', 205000.00, 10250.00, 20, 20, '2025-05-01', '2026-12-01'),
('Scheme-035', 215000.00, 10750.00, 20, 20, '2025-06-01', '2027-01-01'),
('Scheme-036', 225000.00, 11250.00, 20, 20, '2025-06-01', '2027-01-01'),
('Scheme-037', 235000.00, 11750.00, 20, 20, '2025-07-01', '2027-02-01'),
('Scheme-038', 245000.00, 12250.00, 20, 20, '2025-07-01', '2027-02-01'),
('Scheme-039', 255000.00, 12750.00, 20, 20, '2025-08-01', '2027-03-01'),
('Scheme-040', 265000.00, 13250.00, 20, 20, '2025-08-01', '2027-03-01'),
('Scheme-041', 275000.00, 13750.00, 20, 20, '2025-09-01', '2027-04-01'),
('Scheme-042', 285000.00, 14250.00, 20, 20, '2025-09-01', '2027-04-01'),
('Scheme-043', 295000.00, 14750.00, 20, 20, '2025-10-01', '2027-05-01'),
('Scheme-044', 55000.00, 2750.00, 20, 20, '2025-10-01', '2027-05-01'),
('Scheme-045', 65000.00, 3250.00, 20, 20, '2025-11-01', '2027-06-01'),
('Scheme-046', 88000.00, 4400.00, 20, 20, '2025-11-01', '2027-06-01'),
('Scheme-047', 98000.00, 4900.00, 20, 20, '2025-12-01', '2027-07-01'),
('Scheme-048', 108000.00, 5400.00, 20, 20, '2025-12-01', '2027-07-01'),
('Scheme-049', 118000.00, 5900.00, 20, 20, '2026-01-01', '2027-08-01'),
('Scheme-050', 128000.00, 6400.00, 20, 20, '2026-01-01', '2027-08-01'),
('Scheme-051', 100000.00, 10000.00, 10, 10, '2024-01-01', '2024-10-01'),
('Scheme-052', 150000.00, 15000.00, 10, 10, '2024-02-01', '2024-11-01'),
('Scheme-053', 200000.00, 20000.00, 10, 10, '2024-03-01', '2024-12-01'),
('Scheme-054', 50000.00, 5000.00, 10, 10, '2024-04-01', '2025-01-01'),
('Scheme-055', 75000.00, 7500.00, 10, 10, '2024-05-01', '2025-02-01'),
('Scheme-056', 120000.00, 12000.00, 10, 10, '2024-06-01', '2025-03-01'),
('Scheme-057', 180000.00, 18000.00, 10, 10, '2024-07-01', '2025-04-01'),
('Scheme-058', 250000.00, 25000.00, 10, 10, '2024-08-01', '2025-05-01'),
('Scheme-059', 90000.00, 9000.00, 10, 10, '2024-09-01', '2025-06-01'),
('Scheme-060', 110000.00, 11000.00, 10, 10, '2024-10-01', '2025-07-01'),
('Scheme-061', 100000.00, 3333.33, 30, 30, '2024-01-01', '2026-06-01'),
('Scheme-062', 150000.00, 5000.00, 30, 30, '2024-02-01', '2026-07-01'),
('Scheme-063', 200000.00, 6666.67, 30, 30, '2024-03-01', '2026-08-01'),
('Scheme-064', 50000.00, 1666.67, 30, 30, '2024-04-01', '2026-09-01'),
('Scheme-065', 75000.00, 2500.00, 30, 30, '2024-05-01', '2026-10-01'),
('Scheme-066', 120000.00, 4000.00, 30, 30, '2024-06-01', '2026-11-01'),
('Scheme-067', 180000.00, 6000.00, 30, 30, '2024-07-01', '2026-12-01'),
('Scheme-068', 250000.00, 8333.33, 30, 30, '2024-08-01', '2027-01-01'),
('Scheme-069', 90000.00, 3000.00, 30, 30, '2024-09-01', '2027-02-01'),
('Scheme-070', 110000.00, 3666.67, 30, 30, '2024-10-01', '2027-03-01'),
('Scheme-071', 300000.00, 20000.00, 15, 15, '2024-01-01', '2025-03-01'),
('Scheme-072', 85000.00, 5666.67, 15, 15, '2024-02-01', '2025-04-01'),
('Scheme-073', 95000.00, 6333.33, 15, 15, '2024-03-01', '2025-05-01'),
('Scheme-074', 130000.00, 8666.67, 15, 15, '2024-04-01', '2025-06-01'),
('Scheme-075', 160000.00, 10666.67, 15, 15, '2024-05-01', '2025-07-01'),
('Scheme-076', 70000.00, 4666.67, 15, 15, '2024-06-01', '2025-08-01'),
('Scheme-077', 105000.00, 7000.00, 15, 15, '2024-07-01', '2025-09-01'),
('Scheme-078', 115000.00, 7666.67, 15, 15, '2024-08-01', '2025-10-01'),
('Scheme-079', 140000.00, 9333.33, 15, 15, '2024-09-01', '2025-11-01'),
('Scheme-080', 170000.00, 11333.33, 15, 15, '2024-10-01', '2025-12-01'),
('Scheme-081', 100000.00, 8333.33, 12, 12, '2024-01-01', '2024-12-01'),
('Scheme-082', 150000.00, 12500.00, 12, 12, '2024-02-01', '2025-01-01'),
('Scheme-083', 200000.00, 16666.67, 12, 12, '2024-03-01', '2025-02-01'),
('Scheme-084', 50000.00, 4166.67, 12, 12, '2024-04-01', '2025-03-01'),
('Scheme-085', 75000.00, 6250.00, 12, 12, '2024-05-01', '2025-04-01'),
('Scheme-086', 120000.00, 10000.00, 12, 12, '2024-06-01', '2025-05-01'),
('Scheme-087', 180000.00, 15000.00, 12, 12, '2024-07-01', '2025-06-01'),
('Scheme-088', 250000.00, 20833.33, 12, 12, '2024-08-01', '2025-07-01'),
('Scheme-089', 90000.00, 7500.00, 12, 12, '2024-09-01', '2025-08-01'),
('Scheme-090', 110000.00, 9166.67, 12, 12, '2024-10-01', '2025-09-01'),
('Scheme-091', 100000.00, 4000.00, 25, 25, '2024-01-01', '2026-01-01'),
('Scheme-092', 150000.00, 6000.00, 25, 25, '2024-02-01', '2026-02-01'),
('Scheme-093', 200000.00, 8000.00, 25, 25, '2024-03-01', '2026-03-01'),
('Scheme-094', 50000.00, 2000.00, 25, 25, '2024-04-01', '2026-04-01'),
('Scheme-095', 75000.00, 3000.00, 25, 25, '2024-05-01', '2026-05-01'),
('Scheme-096', 120000.00, 4800.00, 25, 25, '2024-06-01', '2026-06-01'),
('Scheme-097', 180000.00, 7200.00, 25, 25, '2024-07-01', '2026-07-01'),
('Scheme-098', 250000.00, 10000.00, 25, 25, '2024-08-01', '2026-08-01'),
('Scheme-099', 90000.00, 3600.00, 25, 25, '2024-09-01', '2026-09-01'),
('Scheme-100', 110000.00, 4400.00, 25, 25, '2024-10-01', '2026-10-01');

PRINT 'Successfully inserted 100 records into Chit_Master';
GO

-- ====================================================================
-- STEP 3: Insert into Scheme_Members (AFTER Chit_Master)
-- ====================================================================
-- NOTE: We need to get the actual Scheme_IDs that were just created
-- They may not be 1-100 if other schemes exist, so we'll use a dynamic approach
-- ====================================================================

PRINT 'Inserting 100 records into Scheme_Members...';
GO

-- Get the latest 100 Scheme_IDs and map them to customers
DECLARE @SchemeMapping TABLE (RowNum INT, Scheme_ID INT, SchemeName VARCHAR(100));

INSERT INTO @SchemeMapping
SELECT TOP 100 
    ROW_NUMBER() OVER (ORDER BY Scheme_ID DESC) as RowNum,
    Scheme_ID,
    Name
FROM Chit_Master
ORDER BY Scheme_ID DESC;

-- Now insert into Scheme_Members using the mapped IDs
INSERT INTO Scheme_Members (Fund_Number, Customer_ID, Scheme_ID, Status, Join_date)
SELECT 
    '2024_' + RIGHT('00' + CAST((RowNum % 12) + 1 AS VARCHAR), 2) + '_' + RIGHT('0000' + CAST(1000 + RowNum AS VARCHAR), 4) as Fund_Number,
    'CUST_' + RIGHT('000' + CAST(RowNum AS VARCHAR), 3) as Customer_ID,
    Scheme_ID,
    'Active' as Status,
    DATEADD(DAY, (RowNum % 365), '2024-01-01') as Join_date
FROM @SchemeMapping
WHERE RowNum <= 100;

PRINT 'Successfully inserted 100 records into Scheme_Members';
GO

-- ====================================================================
-- Verification Queries
-- ====================================================================

PRINT 'Verifying inserted records...';
GO

-- Count records
SELECT COUNT(*) as 'Total Customers' FROM Customer_Master WHERE Customer_ID LIKE 'CUST_%';
SELECT COUNT(*) as 'Total Chit_Master Records' FROM Chit_Master WHERE Name LIKE 'Scheme-%';
SELECT COUNT(*) as 'Total Scheme_Members Records' FROM Scheme_Members WHERE Customer_ID LIKE 'CUST_%';

-- Show samples
SELECT TOP 5 * FROM Customer_Master WHERE Customer_ID LIKE 'CUST_%' ORDER BY Customer_ID DESC;
SELECT TOP 5 * FROM Chit_Master WHERE Name LIKE 'Scheme-%' ORDER BY Scheme_ID DESC;
SELECT TOP 5 * FROM Scheme_Members WHERE Customer_ID LIKE 'CUST_%' ORDER BY Join_date DESC;

PRINT 'Script execution completed successfully!';
GO
