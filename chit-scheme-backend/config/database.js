const sql = require('mssql');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
  
  server: '103.38.50.73',
  database: 'VASANTHAMDB',
  user: 'vasantham',
  password: 'Vasantham@Sa',
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
