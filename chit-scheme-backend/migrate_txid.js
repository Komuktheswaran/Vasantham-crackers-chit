const { sql, connectDB } = require('./config/database');

async function migrate() {
  try {
    await connectDB();
    console.log('Connected to database.');

    console.log('Adding Auction_Transaction_ID to Auctions table...');
    await sql.query`IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Auctions') AND name = 'Auction_Transaction_ID')
      ALTER TABLE Auctions ADD Auction_Transaction_ID VARCHAR(50);`;
    
    console.log('Adding Payment_Transaction_ID to Payment_Master table...');
    await sql.query`IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Payment_Master') AND name = 'Payment_Transaction_ID')
      ALTER TABLE Payment_Master ADD Payment_Transaction_ID VARCHAR(50);`;

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.close();
  }
}

migrate();
