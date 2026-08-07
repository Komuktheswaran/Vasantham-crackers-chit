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
    // Bumped 20 → 50 after load testing revealed pool exhaustion at >30 concurrent
    // requests. Each large-payload endpoint holds a slot ~1s; with bursts of 50
    // concurrent requests the queue blew up. 50 is comfortable + headroom.
    max: 50,
    min: 5,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000,
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
