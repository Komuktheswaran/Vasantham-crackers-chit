const { executeQuery } = require('../models/db');
const sql = require('mssql');

async function verifyDashboard() {
    try {
        console.log('--- Verifying Dashboard Stats ---');
        
        // 1. Total Customers
        const customers = await executeQuery('SELECT COUNT(*) as total FROM Customer_Master');
        console.log('Total Customers (DB):', customers[0].total);

        // 2. Active Schemes & Fund Members
        // Get all schemes and member counts
        const schemes = await executeQuery(`
            SELECT cm.Scheme_ID, cm.Name, 
                   (SELECT COUNT(*) FROM Scheme_Members sm WHERE sm.Scheme_ID = cm.Scheme_ID) as total_members,
                   (SELECT COUNT(*) FROM Scheme_Members sm WHERE sm.Scheme_ID = cm.Scheme_ID AND sm.Status = 'Active') as active_members
            FROM Chit_Master cm
        `);
        
        let totalFundMembers = 0;
        let activeSchemesCount = 0;

        schemes.forEach(s => {
            totalFundMembers += s.total_members;
            if (s.total_members > 0) activeSchemesCount++;
            console.log(`Scheme: ${s.Name}, Total Members: ${s.total_members}, Active Members: ${s.active_members}`);
        });

        console.log('Calculated Total Fund Members:', totalFundMembers);
        console.log('Calculated Active Schemes:', activeSchemesCount);

        console.log('\n--- Verifying Reports Data (Current Year) ---');
        const year = new Date().getFullYear();
        
        const payments = await executeQuery(`
            SELECT MONTH(Amount_Received_date) as month, SUM(Amount_Received) as total
            FROM Payment_Master
            WHERE YEAR(Amount_Received_date) = @param0
            GROUP BY MONTH(Amount_Received_date)
            ORDER BY month
        `, [{ value: year, type: sql.Int }]);

        console.log(`Payments for ${year}:`, payments);

        const dues = await executeQuery(`
            SELECT MONTH(Due_date) as month, SUM(Due_amount - ISNULL(Recd_amount, 0)) as total_pending
            FROM Scheme_Due
            WHERE YEAR(Due_date) = @param0
            GROUP BY MONTH(Due_date)
            ORDER BY month
        `, [{ value: year, type: sql.Int }]);

        console.log(`Dues for ${year}:`, dues);


    } catch (error) {
        console.error('Verification Failed:', error);
    } finally {
        process.exit();
    }
}

verifyDashboard();
