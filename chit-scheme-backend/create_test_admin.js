const sql = require('mssql');
const bcrypt = require('bcryptjs');
const { dbConfig } = require('./config/database');

const createAdmin = async () => {
    try {
        await sql.connect(dbConfig);
        const password = await bcrypt.hash('admin123', 10);
        
        // Check if admin exists
        const result = await sql.query`SELECT * FROM Users WHERE Username = 'admin'`;
        
        if (result.recordset.length === 0) {
            await sql.query`
                INSERT INTO Users (Username, Password_Hash, Role, Full_Name, Created_At)
                VALUES ('admin', ${password}, 'Admin', 'Administrator', GETDATE())
            `;
            console.log('Admin user created: admin / admin123');
        } else {
            console.log('Admin user already exists.');
             // Reset password 
             await sql.query`UPDATE Users SET Password_Hash = ${password} WHERE Username = 'admin'`;
             console.log('Admin password reset to: admin123');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
};

createAdmin();
