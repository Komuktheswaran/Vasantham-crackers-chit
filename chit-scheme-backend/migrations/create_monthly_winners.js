const sql = require('mssql');
const { dbConfig } = require('../config/database');

// ---------------------------------------------------------------------------
// Creates the Monthly_Winners table used by the Auction "Declare Monthly
// Winners" feature. One global set of 3 winners per calendar month:
//   Place 1 → 100% discount on remaining month dues (dues auto-waived)
//   Place 2 → 60 items Gift Box x 1
//   Place 3 → 50 items Gift Box x 1
// Unique on (Win_Month, Place) so re-declaring a month overwrites cleanly.
// ---------------------------------------------------------------------------
async function createMonthlyWinnersTable() {
  try {
    console.log('Connecting to database...');
    await sql.connect(dbConfig);
    console.log('Connected.');

    const exists = await sql.query(`
      SELECT COUNT(*) AS count
      FROM information_schema.tables
      WHERE table_name = 'Monthly_Winners'
    `);

    if (exists.recordset[0].count > 0) {
      console.log('Monthly_Winners table already exists. Nothing to do.');
      return;
    }

    console.log('Creating Monthly_Winners table...');
    await sql.query(`
      CREATE TABLE Monthly_Winners (
        Winner_ID              INT IDENTITY(1,1) PRIMARY KEY,
        Win_Month              VARCHAR(7)   NOT NULL,   -- 'YYYY-MM'
        Place                  INT          NOT NULL,   -- 1, 2, 3
        Fund_Number            VARCHAR(50)  NOT NULL,
        Customer_ID            VARCHAR(50)  NOT NULL,
        Customer_Name          VARCHAR(255) NULL,
        Scheme_ID              INT          NULL,
        Scheme_Name            VARCHAR(255) NULL,
        Prize                  NVARCHAR(255) NOT NULL,
        Discount_amount        DECIMAL(18,2) NULL,      -- amount waived (1st place)
        Auction_Transaction_ID VARCHAR(50)  NULL,
        Created_at             DATETIME     DEFAULT GETDATE(),
        Updated_at             DATETIME     DEFAULT GETDATE(),
        CONSTRAINT UQ_Monthly_Winner_Month_Place UNIQUE (Win_Month, Place)
      )
    `);
    console.log('Monthly_Winners table created successfully.');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await sql.close();
  }
}

createMonthlyWinnersTable();
