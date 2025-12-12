const sql = require('mssql');
const { dbConfig } = require('./config/database');

const verifySchema = async () => {
    try {
        await sql.connect(dbConfig);
        console.log('Connected to database...');

        // 1. Verify PK on Scheme_Members
        const pkResult = await sql.query`
            SELECT name 
            FROM sys.key_constraints 
            WHERE type = 'PK' AND parent_object_id = OBJECT_ID('Scheme_Members')
        `;
        if (pkResult.recordset.length > 0) {
            console.log(`✅ PK Found on Scheme_Members: ${pkResult.recordset[0].name}`);
        } else {
            console.error('❌ PK NOT found on Scheme_Members');
        }

        // 2. Verify FK on Scheme_Due
        const fkResult = await sql.query`
            SELECT name 
            FROM sys.foreign_keys 
            WHERE parent_object_id = OBJECT_ID('Scheme_Due') AND name = 'FK_Scheme_Due_Fund_Number'
        `;
        if (fkResult.recordset.length > 0) {
            console.log(`✅ FK Found on Scheme_Due: ${fkResult.recordset[0].name}`);
        } else {
            console.error('❌ FK NOT found on Scheme_Due');
        }

        // 3. Test Integrity (Try to insert orphan due)
        console.log('Testing Constraint Integrity...');
        try {
            await sql.query`
                INSERT INTO Scheme_Due (Scheme_ID, Customer_ID, Fund_Number, Due_number, Due_date, Due_amount)
                VALUES (1, 'TEST_FAIL', 'INVALID_FUND_123', 1, GETDATE(), 500)
            `;
            console.error('❌ Constraint Failed: Insertion of orphan allowed!');
        } catch (err) {
            if (err.message.includes('FOREIGN KEY constraint')) {
                 console.log('✅ Constraint Verified: Blocked invalid Fund_Number insertion');
            } else {
                console.error('❌ Unexpected Error:', err.message);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sql.close();
    }
};

verifySchema();
