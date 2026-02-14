const sql = require('mssql');
const { dbConfig } = require('./config/database');

async function findUser() {
    try {
        await sql.connect(dbConfig);
        const result = await sql.query('SELECT TOP 1 Username FROM User_Master');
        console.log('User found:', result.recordset[0]);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

findUser();
