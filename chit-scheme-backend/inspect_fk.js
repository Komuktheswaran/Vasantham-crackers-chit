const { dbConfig } = require('./config/database');
const sql = require('mssql');

async function inspectFK() {
    try {
        await sql.connect(dbConfig);
        
        console.log('--- Foreign Keys referencing Scheme_Due ---');
        const result = await new sql.Request().query(`
            SELECT 
                f.name AS ForeignKey,
                OBJECT_NAME(f.parent_object_id) AS TableName,
                COL_NAME(fc.parent_object_id, fc.parent_column_id) AS ColumnName,
                OBJECT_NAME (f.referenced_object_id) AS ReferenceTableName,
                COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS ReferenceColumnName
            FROM 
                sys.foreign_keys AS f
            INNER JOIN 
                sys.foreign_key_columns AS fc ON f.object_id = fc.constraint_object_id
            WHERE 
                OBJECT_NAME(f.referenced_object_id) IN ('Customer_Master', 'Scheme_Members', 'Scheme_Due', 'Payment_Master');
        `);
        
        console.table(result.recordset);
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

inspectFK();
