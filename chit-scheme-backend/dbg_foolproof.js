const { executeQuery } = require('./models/db');

async function run() {
    try {
        const allTables = await executeQuery("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
    console.log('Tables in DB:');
    allTables.forEach(t => console.log(`- ${t.TABLE_NAME}`));

    for (const t of allTables) {
        if (t.TABLE_NAME.includes('Member') || t.TABLE_NAME.includes('Due') || t.TABLE_NAME.includes('Pay')) {
            console.log(`\n--- Columns in ${t.TABLE_NAME} ---`);
            const cols = await executeQuery(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${t.TABLE_NAME}'`);
            cols.forEach(c => console.log(`- ${c.COLUMN_NAME} (${c.DATA_TYPE})`));
        }
    }

    } catch (err) {
        console.error('FATAL:', err);
    } finally {
        process.exit();
    }
}

run();
