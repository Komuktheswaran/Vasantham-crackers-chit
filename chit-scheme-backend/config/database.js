const sql = require('mssql');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
  server: "103.38.50.247",
  database: "VASANTHAMDBLIVE",
  user: "vasanthamsa",
  password: "Vasantham@Sa",
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 300000, // 5 minutes
  },
  pool: {
    max: 20,   // 1000 was dangerously high — SQL Server default max is 32767 but node processes don't need more than ~20
    min: 2,
    idleTimeoutMillis: 30000,
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
