const sql = require('mssql');
const { dbConfig } = require('./config/database');

async function checkTriggers() {
    try {
        await sql.connect(dbConfig);
        
        const query = `
            SELECT 
                t.name as Trigger_Name,
                OBJECT_NAME(t.parent_id) as Table_Name,
                m.definition as Trigger_Definition
            FROM sys.triggers t
            JOIN sys.sql_modules m ON t.object_id = m.object_id
            WHERE OBJECT_NAME(t.parent_id) IN ('Scheme_Members', 'Scheme_Due')
        `;
        
        const result = await sql.query(query);
        console.log('Triggers found:', result.recordset);
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

checkTriggers();
