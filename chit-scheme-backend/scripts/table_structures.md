# Database Table Structures

## Chit_Master Table

**Purpose**: Stores chit scheme information

| Column Name        | Data Type     | Constraints           | Description                             |
| ------------------ | ------------- | --------------------- | --------------------------------------- |
| `Scheme_ID`        | INT           | PRIMARY KEY, IDENTITY | Auto-generated unique scheme identifier |
| `Name`             | VARCHAR(100)  | NOT NULL              | Name of the chit scheme                 |
| `Total_Amount`     | DECIMAL(15,2) | NOT NULL              | Total amount of the scheme              |
| `Amount_per_month` | DECIMAL(15,2) | NOT NULL              | Monthly installment amount              |
| `Period`           | INT           | NOT NULL              | Duration of scheme in months            |
| `Number_of_due`    | INT           | NOT NULL              | Total number of dues to be collected    |
| `Month_from`       | DATE          | NOT NULL              | Scheme start date                       |
| `Month_to`         | DATE          | NOT NULL              | Scheme end date                         |

### Example:

```sql
INSERT INTO Chit_Master
(Name, Total_Amount, Amount_per_month, Period, Number_of_due, Month_from, Month_to)
VALUES
('Scheme-001', 100000.00, 5000.00, 20, 20, '2024-01-01', '2025-08-01');
```

---

## Scheme_Members Table

**Purpose**: Links customers to schemes they've joined, creating memberships

| Column Name   | Data Type   | Constraints                             | Description                            |
| ------------- | ----------- | --------------------------------------- | -------------------------------------- |
| `Fund_Number` | VARCHAR(50) | PRIMARY KEY                             | Unique fund number for this membership |
| `Customer_ID` | VARCHAR(50) | FOREIGN KEY → Customer_Master, NOT NULL | References customer who joined         |
| `Scheme_ID`   | INT         | FOREIGN KEY → Chit_Master, NOT NULL     | References the scheme joined           |
| `Status`      | VARCHAR(20) | DEFAULT 'Active'                        | Membership status (Active/Inactive)    |
| `Join_date`   | DATETIME    | DEFAULT GETDATE()                       | Date when customer joined the scheme   |

### Foreign Key Relationships:

- `Customer_ID` → `Customer_Master.Customer_ID`
- `Scheme_ID` → `Chit_Master.Scheme_ID`

### Example:

```sql
INSERT INTO Scheme_Members
(Fund_Number, Customer_ID, Scheme_ID, Status, Join_date)
VALUES
('2024_01_1001', 'CUST_001', 1, 'Active', '2024-01-01');
```

---

## Important Notes:

1. **Scheme_ID Auto-Generation**: The `Scheme_ID` is an IDENTITY column that auto-increments. You should NOT specify this value in INSERT statements.

2. **Customer_ID Requirement**: Before inserting into `Scheme_Members`, ensure the referenced `Customer_ID` exists in the `Customer_Master` table.

3. **Scheme_ID Reference**: When inserting into `Scheme_Members`, use existing `Scheme_ID` values from `Chit_Master`.

4. **Fund_Number Format**: Typically follows pattern `YYYY_MM_####` (Year_Month_RandomNumber).

5. **Cascade Deletes**:

   - Deleting a Scheme will delete related Scheme_Members
   - Deleting a Customer will delete related Scheme_Members

6. **Date Formats**: Use ISO format ('YYYY-MM-DD') for dates.

---

## Database Diagram:

```
Customer_Master
    └─── Scheme_Members ───┐
                           │
Chit_Master ───────────────┘
```

- One Customer can join many Schemes (1:N)
- One Scheme can have many Members (1:N)
- Scheme_Members is the junction table (M:N relationship)
