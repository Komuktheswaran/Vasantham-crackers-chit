const sql = require('mssql');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
  
  server: process.env.DB_SERVER ,
  database: process.env.DB_NAME ,
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD ,
  port: parseInt(process.env.DB_PORT) ,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 300000 // 5 minutes
  },
  pool: {
    max: 1000,
    min: 0,
    idleTimeoutMillis: 3000000
  },
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
