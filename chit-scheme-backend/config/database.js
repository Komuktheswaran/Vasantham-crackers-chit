const sql = require('mssql');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'ChitSchemeDB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const connectDB = async () => {
  try {
    await sql.connect(dbConfig);
    console.log('✅ MSSQL Database connected successfully');
    return sql;
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    throw err;
  }
};

module.exports = { sql, connectDB, dbConfig };
