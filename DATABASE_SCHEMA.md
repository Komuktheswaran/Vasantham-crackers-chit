# Database Schema Documentation

This document clearly outlines the primary core tables used for managing Customers, Chit Schemes, Scheme Dues, and Logistics/Tracking within the SQL Server database.

## Entity Relationship Diagram

\`\`\`mermaid
erDiagram
Customer_Master ||--o{ Scheme_Members : "enrolls in"
Customer_Master ||--o{ Scheme_Due : "owes"
Customer_Master ||--o{ Order_Tracking : "tracks"

    Chit_Master ||--o{ Scheme_Members : "has members"
    Chit_Master ||--o{ Scheme_Due : "generates"

    State_Master ||--o{ District_Master : "contains"
    State_Master ||--o{ Customer_Master : "resides in"
    District_Master ||--o{ Customer_Master : "resides in"

    Transporters ||--o{ Delivery_Points : "services"
    Transporters ||--o{ Order_Tracking : "delivers"

\`\`\`

---

## Table Definitions

### 1. Customer_Master

Stores profile and contact details for all chit fund participants.

| Column Name         | Data Type | Constraints     | Description                                 |
| ------------------- | --------- | --------------- | ------------------------------------------- |
| `Customer_ID`       | `varchar` | **Primary Key** | Unique identifier for customer (e.g. C001)  |
| `Name`              | `varchar` | Not Null        | Full name of the customer                   |
| `Customer_Code`     | `varchar` | Unique          | System generated logical grouping code      |
| `Customer_Type`     | `varchar` |                 | Segment identifier (e.g. Retail, Wholesale) |
| `Phone_Number`      | `varchar` | Not Null        | Primary contact number                      |
| `Phone_Number2`     | `varchar` |                 | Secondary contact                           |
| `Address1`          | `varchar` |                 | Street address line 1                       |
| `Address2`          | `varchar` |                 | Street address line 2                       |
| `Area`              | `varchar` |                 | Neighborhood or locality                    |
| `Pincode`           | `int`     |                 | Postal/ZIP code                             |
| `State_ID`          | `int`     | Foreign Key     | References `State_Master`                   |
| `District_ID`       | `int`     | Foreign Key     | References `District_Master`                |
| `Delivery_Point_ID` | `int`     | Foreign Key     | References `Delivery_Points`                |

### 2. Chit_Master (Schemes)

Defines the parameters for various chit groups or scheme cycles.

| Column Name        | Data Type | Constraints               | Description                  |
| ------------------ | --------- | ------------------------- | ---------------------------- |
| `Scheme_ID`        | `int`     | **Primary Key**, Identity | Auto-incrementing scheme ID  |
| `Name`             | `varchar` | Not Null                  | Name of the chit scheme      |
| `Total_Amount`     | `decimal` | Not Null                  | Total payout maturity amount |
| `Amount_per_month` | `decimal` | Not Null                  | Scheduled monthly due        |
| `Period`           | `int`     |                           | Total duration in months     |
| `Number_of_due`    | `int`     |                           | Total number of installments |
| `Month_from`       | `date`    |                           | Start month/year             |
| `Month_to`         | `date`    |                           | Maturity month/year          |
| `Bonus_Percentage` | `decimal` |                           | Expected bonus multiplier    |
| `Bonus_Amount`     | `decimal` |                           | Fixed bonus amount           |

### 3. Scheme_Members

Intersection table linking Customers to Schemes they have joined.

| Column Name     | Data Type | Constraints               | Description                                 |
| --------------- | --------- | ------------------------- | ------------------------------------------- |
| `Membership_ID` | `int`     | **Primary Key**, Identity | Unique enrollment identifier                |
| `Customer_ID`   | `varchar` | Foreign Key               | References `Customer_Master`                |
| `Scheme_ID`     | `int`     | Foreign Key               | References `Chit_Master`                    |
| `Fund_Number`   | `varchar` |                           | Participant ticket/fund number in the group |
| `Join_date`     | `date`    | Not Null                  | Date of enrollment                          |
| `Status`        | `varchar` | Default 'Active'          | Active, Completed, or Defaulted             |
| `Created_at`    | `date`    |                           | Audit timestamp                             |

### 4. Scheme_Due

Tracks the monthly installment schedules and payment receipts per member per scheme.

| Column Name         | Data Type | Constraints                 | Description                             |
| ------------------- | --------- | --------------------------- | --------------------------------------- |
| `Scheme_ID`         | `int`     | **Foreign Key**             | References `Chit_Master`                |
| `Customer_ID`       | `varchar` | **Foreign Key**             | References `Customer_Master`            |
| `Fund_Number`       | `varchar` |                             | Ties back to specific enrollment ticket |
| `Due_number`        | `int`     | **Composite Key Candidate** | Represents month 1, 2, 3...             |
| `Due_date`          | `date`    |                             | Deadline for this specific due          |
| `Due_amount`        | `decimal` | Not Null                    | Scheduled amount                        |
| `Recd_amount`       | `decimal` | Default 0.00                | Actual amount successfully collected    |
| `amt_received_date` | `date`    |                             | Date the cash or transfer was processed |

### 5. Order_Tracking

Logistics management tracker for maturity/bonus distributions or product consignments.

| Column Name           | Data Type | Constraints               | Description                            |
| --------------------- | --------- | ------------------------- | -------------------------------------- |
| `Tracking_ID`         | `int`     | **Primary Key**, Identity | System internal tracking primary key   |
| `Tracking_Number`     | `varchar` | Unique                    | Publicly visible waybill/tracking code |
| `Order_Number`        | `varchar` |                           | Associated invoice/order logic         |
| `Customer_ID`         | `varchar` | Foreign Key               | The recipient customer                 |
| `Fund_Number`         | `varchar` |                           | Group ticket the order fulfills        |
| `Transporter_Name`    | `varchar` |                           | Logistics provider name                |
| `Transporter_Contact` | `varchar` |                           | Driver or agency phone                 |
| `Parcel_Quantity`     | `int`     |                           | Number of physical boxes shipped       |
| `Packing_Status`      | `varchar` |                           | Pending, Packed, or Dispatched         |

### 6. Transporters

Directory of external logistics and transportation companies used.

| Column Name        | Data Type  | Constraints               | Description                   |
| ------------------ | ---------- | ------------------------- | ----------------------------- |
| `Transporter_ID`   | `int`      | **Primary Key**, Identity | Unique ID for the transporter |
| `Transporter_Name` | `nvarchar` | Not Null                  | Company Name                  |
| `Contact_Person`   | `nvarchar` |                           | Key contact name              |
| `Phone_Number`     | `nvarchar` |                           | Transporter helpline/mobile   |

### 7. Delivery_Points

Branch or drop-off locations mapped to transporters.

| Column Name         | Data Type  | Constraints               | Description                                |
| ------------------- | ---------- | ------------------------- | ------------------------------------------ |
| `Delivery_Point_ID` | `int`      | **Primary Key**, Identity | Area ID                                    |
| `Transporter_ID`    | `int`      | Foreign Key               | References `Transporters`                  |
| `Place_Name`        | `nvarchar` |                           | City or distinct geographical hub          |
| `Branch_Address`    | `varchar`  |                           | Full physical address of the drop location |
| `Branch_Phone`      | `varchar`  |                           | Branch specific contact                    |

### 8. State_Master & District_Master

Lookup tables ensuring geographical normalization.

**State_Master:**

- `State_ID` (int, PK)
- `State_Name` (varchar)

**District_Master:**

- `District_ID` (int, PK)
- `District_Name` (varchar)
- `State_ID` (int, FK)
