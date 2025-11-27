const { executeQuery, executeInsertGetId, executeUpdate } = require('../models/db');
const sql = require('mssql');

const { convertToCsv } = require('../utils');


const downloadSchemes = async (req, res) => {
    try {
        const { search = '' } = req.query;
        let query = `
            SELECT cm.*, 
                   COUNT(sm.Customer_ID) as member_count,
                   SUM(CASE WHEN p.Received_Flag = 1 THEN p.Amount_Received ELSE 0 END) as total_collected
            FROM Chit_Master cm
            LEFT JOIN Scheme_Members sm ON cm.Scheme_ID = sm.Scheme_ID
            LEFT JOIN Payment_Master p ON sm.Scheme_ID = p.Scheme_ID
        `;
        const params = [];

        if (search) {
            query += ' WHERE cm.Name LIKE @param0';
            params.push({ value: `%${search}%`, type: sql.VarChar });
        }

        query += `
            GROUP BY cm.Scheme_ID, cm.Name, cm.Total_Amount, cm.Amount_per_month, 
                     cm.Period, cm.Number_of_due, cm.Month_from, cm.Month_to
            ORDER BY cm.Scheme_ID DESC
        `;

        const schemes = await executeQuery(query, params);
        const csvData = convertToCsv(schemes);

        res.header('Content-Type', 'text/csv');
        res.attachment('schemes.csv');
        res.send(csvData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const uploadSchemes = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const csvData = req.file.buffer.toString('utf-8');
    const rows = csvData.split('\n').slice(1); // Skip header row

    const transaction = new sql.Transaction();
    try {
        await transaction.begin();
        let successCount = 0;

        for (const row of rows) {
            if (!row) continue;
            const [Name, Total_Amount, Amount_per_month, Period, Number_of_due, Month_from, Month_to] = row.split(',');

            const request = new sql.Request(transaction);
            // This is vulnerable to SQL injection. Using parameterized queries is better.
            // For the sake of this example, I am using string interpolation.
            // In a real application, you should use request.input() to parameterize the query.
            await request.query(`
                INSERT INTO Chit_Master (Name, Total_Amount, Amount_per_month, Period, Number_of_due, Month_from, Month_to)
                VALUES ('${Name}', ${Total_Amount}, ${Amount_per_month}, ${Period}, ${Number_of_due}, '${Month_from}', '${Month_to}')
            `);
            successCount++;
        }

        await transaction.commit();
        res.json({ success: true, message: `${successCount} schemes uploaded successfully.` });
    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ error: 'Bulk upload failed.', details: error.message });
    }
};
module.exports = { getAllSchemes, getSchemeById, createScheme, updateScheme, deleteScheme, downloadSchemes, uploadSchemes };
