const { executeQuery } = require('../models/db');
const sql = require('mssql');
const { sendWhatsappMessage } = require('../services/whatsappService');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const dayjs = require('dayjs');

/**
 * Core logic to send reminders for the current month
 * @returns {Promise<{success: number, failed: number}>}
 */
const processMonthlyReminders = async () => {
    const today = dayjs();
    // Range: Start of previous month to end of current month
    const startDate = today.subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
    const endDate = today.endOf('month').format('YYYY-MM-DD');

    console.log(`[Reminders] 📅 Starting process for range: ${startDate} to ${endDate}`);

    // Query for all pending dues in specified range
    const query = `
        SELECT 
            c.Name as Customer_Name,
            c.Phone_Number,
            sd.Due_amount,
            sd.Recd_amount,
            cm.Name as Scheme_Name,
            sd.Due_number,
            sd.Due_date
        FROM Scheme_Due sd
        JOIN Customer_Master c ON sd.Customer_ID = c.Customer_ID
        JOIN Chit_Master cm ON sd.Scheme_ID = cm.Scheme_ID
        JOIN Scheme_Members sm ON sd.Fund_Number = sm.Fund_Number
        WHERE sd.Due_date BETWEEN @start AND @end
        AND (sd.Recd_amount IS NULL OR sd.Recd_amount < sd.Due_amount)
        AND sm.Status = 'Active'
    `;

    const params = [
        { name: 'start', value: startDate, type: sql.Date },
        { name: 'end', value: endDate, type: sql.Date }
    ];

    try {
        const pendingDues = await executeQuery(query, params);
        console.log(`[Reminders] 🔍 Found ${pendingDues.length} pending dues in range`);

        let successCount = 0;
        let failedCount = 0;

        for (const due of pendingDues) {
            const amountToPay = due.Due_amount - (due.Recd_amount || 0);
            const dueMonth = dayjs(due.Due_date);
            
            // Parameters for 'reminder1':
            // 1 - customer name
            // 2 - amount for that month
            // 3 - month name
            // 4 - last date (10th of every month)
            const templateParams = [
                due.Customer_Name,
                amountToPay.toString(),
                dueMonth.format('MMMM'),
                `10th of ${dueMonth.format('MMMM YYYY')}`
            ];

            try {
                const result = await sendWhatsappMessage(
                    due.Phone_Number,
                    "reminder1",
                    templateParams,
                    due.Customer_Name
                );
                if (result) successCount++;
                else failedCount++;
            } catch (err) {
                console.error(`[Reminders] ❌ Failed for ${due.Customer_Name}:`, err.message);
                failedCount++;
            }
        }

        return { success: successCount, failed: failedCount, total: pendingDues.length };
    } catch (error) {
        console.error('[Reminders] ❌ Database Query Failed:', error);
        throw error;
    }
};

const sendManualReminders = async (req, res) => {
    try {
        const result = await processMonthlyReminders();
        return sendSuccess(res, `Reminders processed: ${result.success} sent, ${result.failed} failed.`, result);
    } catch (error) {
        return sendError(res, 'Failed to trigger manual reminders', error);
    }
};

module.exports = {
    processMonthlyReminders,
    sendManualReminders
};
