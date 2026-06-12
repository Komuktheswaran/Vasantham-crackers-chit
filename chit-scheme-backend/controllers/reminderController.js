const { executeQuery } = require('../models/db');
const sql = require('mssql');
const { sendWhatsappMessage } = require('../services/whatsappService');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const dayjs = require('dayjs');

/**
 * Core logic to send reminders for the current month
 * @returns {Promise<{success: number, failed: number}>}
 */
const processMonthlyReminders = async (opts = {}) => {
    const today = dayjs();

    // dueMonths takes precedence if provided: explicit ['YYYY-MM', ...] list.
    // Otherwise fall back to monthsOverdue (N months back from today).
    const dueMonths = Array.isArray(opts.dueMonths)
        ? opts.dueMonths.filter(m => /^\d{4}-\d{2}$/.test(m))
        : [];

    // customerIds: list of target customer IDs. Falls back to single customerId
    // for backwards compatibility with the older per-row send call.
    const customerIds = Array.isArray(opts.customerIds) && opts.customerIds.length > 0
        ? opts.customerIds.filter(Boolean)
        : (opts.customerId ? [opts.customerId] : []);

    let query = `
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
        WHERE (sd.Recd_amount IS NULL OR sd.Recd_amount < sd.Due_amount)
        AND sm.Status = 'Active'
    `;

    const params = [];

    if (dueMonths.length > 0) {
        const placeholders = dueMonths.map((_, i) => `@m${i}`).join(',');
        query += ` AND FORMAT(sd.Due_date, 'yyyy-MM') IN (${placeholders})`;
        dueMonths.forEach((m, i) => params.push({ name: `m${i}`, value: m, type: sql.VarChar(7) }));
        console.log(`[Reminders] 📅 Months: ${dueMonths.join(', ')} | targets=${customerIds.length || 'ALL'}`);
    } else {
        const monthsOverdue = Math.max(1, parseInt(opts.monthsOverdue, 10) || 1);
        const startDate = today.subtract(monthsOverdue, 'month').startOf('month').format('YYYY-MM-DD');
        const endDate = today.endOf('month').format('YYYY-MM-DD');
        query += ` AND sd.Due_date BETWEEN @start AND @end`;
        params.push({ name: 'start', value: startDate, type: sql.Date });
        params.push({ name: 'end', value: endDate, type: sql.Date });
        console.log(`[Reminders] 📅 Range ${startDate} → ${endDate} | targets=${customerIds.length || 'ALL'} | monthsOverdue=${monthsOverdue}`);
    }

    if (customerIds.length > 0) {
        const placeholders = customerIds.map((_, i) => `@cust${i}`).join(',');
        query += ` AND sd.Customer_ID IN (${placeholders})`;
        customerIds.forEach((id, i) => params.push({ name: `cust${i}`, value: id, type: sql.VarChar(50) }));
    }

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
        const body = req.body || {};
        const q = req.query || {};
        const result = await processMonthlyReminders({
            monthsOverdue: body.months_overdue ?? q.months_overdue,
            customerId:    body.customer_id   ?? q.customer_id,
            dueMonths:     body.due_months    ?? q.due_months,
            customerIds:   body.customer_ids  ?? q.customer_ids,
        });
        return sendSuccess(res, `Reminders processed: ${result.success} sent, ${result.failed} failed.`, result);
    } catch (error) {
        return sendError(res, 'Failed to trigger manual reminders', error);
    }
};

module.exports = {
    processMonthlyReminders,
    sendManualReminders
};
