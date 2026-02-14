const { executeQuery } = require('../models/db');

async function inspectTable() {
    try {
        const query = `
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Scheme_Due'
            ORDER BY ORDINAL_POSITION
        `;
        const columns = await executeQuery(query);
        console.table(columns);
    } catch (error) {
        console.error('Error:', error);
    } process.exit();
}

inspectTable();
