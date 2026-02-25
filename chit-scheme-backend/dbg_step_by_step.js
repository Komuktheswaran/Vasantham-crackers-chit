const { executeQuery } = require('./models/db');

async function run() {
    try {
        console.log('1. Checking INFORMATION_SCHEMA for Membership_ID...');
        const res1 = await executeQuery("SELECT TABLE_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME = 'Membership_ID'");
        console.dir(res1, { depth: null });

        console.log('\n2. Testing select on Scheme_Members...');
        const res2 = await executeQuery("SELECT TOP 1 Membership_ID FROM Scheme_Members");
        console.dir(res2, { depth: null });

        console.log('\n3. Testing select on Payment_Master...');
        const res3 = await executeQuery("SELECT TOP 1 Membership_ID FROM Payment_Master");
        console.dir(res3, { depth: null });

        console.log('\n4. Testing select on Scheme_Due...');
        const res4 = await executeQuery("SELECT TOP 1 Membership_ID FROM Scheme_Due");
        console.dir(res4, { depth: null });

    } catch (err) {
        console.error('STEP FAILED:');
        console.dir(err, { depth: null });
    } finally {
        process.exit();
    }
}

run();
