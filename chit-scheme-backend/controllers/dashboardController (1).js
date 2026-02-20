const { executeQuery } = require('../models/db');
const sql = require('mssql');

const getMonthlyStats = async (req, res) => {
  try {
    const { year, customerId, schemeId } = req.query;
    const selectedYear = year || new Date().getFullYear();

    // Build WHERE clauses based on filters
    let paymentWhereClause = 'WHERE YEAR(Amount_Received_date) = @param0';
    let dueWhereClause = 'WHERE YEAR(Due_date) = @param0';
    const params = [{ value: parseInt(selectedYear), type: sql.Int }];
    let paramIndex = 1;

    // Add customer filter if provided
    if (customerId) {
      paymentWhereClause += ` AND Customer_ID = @param${paramIndex}`;
      dueWhereClause += ` AND Customer_ID = @param${paramIndex}`;
      params.push({ value: customerId, type: sql.VarChar(50) });
      paramIndex++;
    }

    // Add scheme filter if provided
    if (schemeId) {
      paymentWhereClause += ` AND Scheme_ID = @param${paramIndex}`;
      dueWhereClause += ` AND Scheme_ID = @param${paramIndex}`;
      params.push({ value: parseInt(schemeId), type: sql.Int });
      paramIndex++;
    }

    // Get monthly payment totals
    const paymentsQuery = `
      SELECT 
        MONTH(Amount_Received_date) as month,
        SUM(Amount_Received) as total_received
      FROM Payment_Master
      ${paymentWhereClause}
      GROUP BY MONTH(Amount_Received_date)
      ORDER BY MONTH(Amount_Received_date)
    `;

    // Get monthly due totals
    const duesQuery = `
      SELECT 
        MONTH(Due_date) as month,
        SUM(Due_amount - ISNULL(Recd_amount, 0)) as total_pending
      FROM Scheme_Due
      ${dueWhereClause}
      GROUP BY MONTH(Due_date)
      ORDER BY MONTH(Due_date)
    `;

    const [paymentsData, duesData] = await Promise.all([
      executeQuery(paymentsQuery, params),
      executeQuery(duesQuery, params)
    ]);

    // Create month map
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = months.map((month, index) => {
      const monthNum = index + 1;
      const payment = paymentsData.find(p => p.month === monthNum);
      const due = duesData.find(d => d.month === monthNum);

      return {
        month,
        payments: payment ? parseFloat(payment.total_received) : 0,
        due: due ? parseFloat(due.total_pending) : 0
      };
    });

    res.json(monthlyData);
  } catch (error) {
    console.error('❌ getMonthlyStats Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getCustomerStats = async (req, res) => {
  try {
    const query = `
      SELECT TOP 10
        c.Customer_ID,
        c.Name as customer_name,
        COUNT(DISTINCT sm.Scheme_ID) as scheme_count,
        ISNULL(SUM(sd.Recd_amount), 0) as total_paid,
        ISNULL(SUM(sd.Due_amount), 0) as total_due
      FROM Customer_Master c
      LEFT JOIN Scheme_Members sm ON c.Customer_ID = sm.Customer_ID
      LEFT JOIN Scheme_Due sd ON c.Customer_ID = sd.Customer_ID
      GROUP BY c.Customer_ID, c.Name
      ORDER BY total_paid DESC
    `;

    const result = await executeQuery(query);
    res.json(result);
  } catch (error) {
    console.error('❌ getCustomerStats Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getCustomerDetails = async (req, res) => {
  try {
    const { customerId } = req.params;

    // Get customer info
    const customerQuery = `
      SELECT * FROM Customer_Master WHERE Customer_ID = @param0
    `;
    const customer = await executeQuery(customerQuery, [{ value: customerId, type: sql.VarChar(50) }]);

    // Get schemes with payment status
    const schemesQuery = `
      SELECT 
        cm.Scheme_ID,
        cm.Name,
        cm.Total_Amount,
        cm.Number_of_due,
        COUNT(sd.Due_number) as total_dues,
        SUM(CASE WHEN sd.Recd_amount >= sd.Due_amount THEN 1 ELSE 0 END) as paid_dues,
        SUM(sd.Due_amount) as total_due_amount,
        SUM(ISNULL(sd.Recd_amount, 0)) as total_paid_amount
      FROM Scheme_Members sm
      JOIN Chit_Master cm ON sm.Scheme_ID = cm.Scheme_ID
      LEFT JOIN Scheme_Due sd ON sm.Scheme_ID = sd.Scheme_ID AND sm.Customer_ID = sd.Customer_ID
      WHERE sm.Customer_ID = @param0
      GROUP BY cm.Scheme_ID, cm.Name, cm.Total_Amount, cm.Number_of_due
    `;
    const schemes = await executeQuery(schemesQuery, [{ value: customerId, type: sql.VarChar(50) }]);

    // Get payment history
    const paymentsQuery = `
      SELECT 
        pm.*,
        cm.Name as scheme_name
      FROM Payment_Master pm
      JOIN Chit_Master cm ON pm.Scheme_ID = cm.Scheme_ID
      WHERE pm.Customer_ID = @param0
      ORDER BY pm.Amount_Received_date DESC
    `;
    const payments = await executeQuery(paymentsQuery, [{ value: customerId, type: sql.VarChar(50) }]);

    res.json({
      customer: customer[0],
      schemes,
      payments
    });
  } catch (error) {
    console.error('❌ getCustomerDetails Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getSchemeDetails = async (req, res) => {
  try {
    const { schemeId } = req.params;

    // Get scheme info
    const schemeQuery = `
      SELECT * FROM Chit_Master WHERE Scheme_ID = @param0
    `;
    const scheme = await executeQuery(schemeQuery, [{ value: parseInt(schemeId), type: sql.Int }]);

    // Get members with payment status
    const membersQuery = `
      SELECT 
        c.Customer_ID,
        c.Name as customer_name,
        c.Phone_Number,
        COUNT(sd.Due_number) as total_dues,
        SUM(CASE WHEN sd.Recd_amount >= sd.Due_amount THEN 1 ELSE 0 END) as paid_dues,
        SUM(sd.Due_amount) as total_due_amount,
        SUM(ISNULL(sd.Recd_amount, 0)) as total_paid_amount
      FROM Scheme_Members sm
      JOIN Customer_Master c ON sm.Customer_ID = c.Customer_ID
      LEFT JOIN Scheme_Due sd ON sm.Scheme_ID = sd.Scheme_ID AND sm.Customer_ID = sd.Customer_ID
      WHERE sm.Scheme_ID = @param0
      GROUP BY c.Customer_ID, c.Name, c.Phone_Number
    `;
    const members = await executeQuery(membersQuery, [{ value: parseInt(schemeId), type: sql.Int }]);

    // Get month-wise collection
    const monthlyQuery = `
      SELECT 
        MONTH(sd.Due_date) as month,
        YEAR(sd.Due_date) as year,
        SUM(sd.Due_amount) as total_due,
        SUM(ISNULL(sd.Recd_amount, 0)) as total_received
      FROM Scheme_Due sd
      WHERE sd.Scheme_ID = @param0
      GROUP BY MONTH(sd.Due_date), YEAR(sd.Due_date)
      ORDER BY year, month
    `;
    const monthlyCollection = await executeQuery(monthlyQuery, [{ value: parseInt(schemeId), type: sql.Int }]);

    res.json({
      scheme: scheme[0],
      members,
      monthlyCollection
    });
  } catch (error) {
    console.error('❌ getSchemeDetails Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getMonthDetails = async (req, res) => {
  try {
    const { year, month } = req.params;

    // Get payments for the month
    const paymentsQuery = `
      SELECT 
        pm.*,
        c.Name as customer_name,
        cm.Name as scheme_name
      FROM Payment_Master pm
      JOIN Customer_Master c ON pm.Customer_ID = c.Customer_ID
      JOIN Chit_Master cm ON pm.Scheme_ID = cm.Scheme_ID
      WHERE YEAR(pm.Amount_Received_date) = @param0 AND MONTH(pm.Amount_Received_date) = @param1
      ORDER BY pm.Amount_Received_date DESC
    `;
    const payments = await executeQuery(paymentsQuery, [
      { value: parseInt(year), type: sql.Int },
      { value: parseInt(month), type: sql.Int }
    ]);

    // Get dues for the month
    const duesQuery = `
      SELECT 
        sd.*,
        c.Name as customer_name,
        cm.Name as scheme_name,
        (sd.Due_amount - ISNULL(sd.Recd_amount, 0)) as pending_amount
      FROM Scheme_Due sd
      JOIN Customer_Master c ON sd.Customer_ID = c.Customer_ID
      JOIN Chit_Master cm ON sd.Scheme_ID = cm.Scheme_ID
      WHERE YEAR(sd.Due_date) = @param0 AND MONTH(sd.Due_date) = @param1
      AND (sd.Recd_amount < sd.Due_amount OR sd.Recd_amount IS NULL)
      ORDER BY sd.Due_date
    `;
    const dues = await executeQuery(duesQuery, [
      { value: parseInt(year), type: sql.Int },
      { value: parseInt(month), type: sql.Int }
    ]);

    // Get summary
    const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.Amount_Received || 0), 0);
    const totalDues = dues.reduce((sum, d) => sum + parseFloat(d.pending_amount || 0), 0);

    res.json({
      summary: {
        totalPayments,
        totalDues,
        paymentsCount: payments.length,
        duesCount: dues.length
      },
      payments,
      dues
    });
  } catch (error) {
    console.error('❌ getMonthDetails Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getMonthlyStats, getCustomerStats, getCustomerDetails, getSchemeDetails, getMonthDetails };
