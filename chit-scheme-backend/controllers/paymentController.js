 
const { executeQuery, executeInsert } = require('../models/db');
const sql = require('mssql');

const getPaymentsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const result = await executeQuery(`
      SELECT p.*, cm.Name as scheme_name
      FROM Payment_Master p
      JOIN Chit_Master cm ON p.Scheme_ID = cm.Scheme_ID
      WHERE p.Customer_ID = @param0
      ORDER BY p.Due_Month DESC
    `, [{ value: parseInt(customerId), type: sql.Int }]);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getDuesByScheme = async (req, res) => {
  try {
    const { customerId, schemeId } = req.params;
    const result = await executeQuery(`
      SELECT * FROM Scheme_Due 
      WHERE Customer_ID = @param0 AND Scheme_ID = @param1
      ORDER BY Due_number ASC
    `, [
      { value: customerId, type: sql.VarChar(50) },
      { value: parseInt(schemeId), type: sql.Int }
    ]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const recordPayment = async (req, res) => {
  const connection = await sql.connect(require('../config/database').dbConfig);
  const transaction = new sql.Transaction(connection);

  try {
    const { Scheme_ID, Customer_ID, Due_number, Transaction_ID, Amount_Received, Payment_Date } = req.body;
    
    await transaction.begin();

    // 1. Insert into Payment_Master
    const request = new sql.Request(transaction);
    const result = await request
      .input('schemeId', sql.Int, Scheme_ID)
      .input('customerId', sql.VarChar(50), Customer_ID)
      .input('dueNumber', sql.Int, Due_number)
      .input('transactionId', sql.VarChar(50), Transaction_ID)
      .input('amount', sql.Decimal(15, 2), Amount_Received)
      .input('date', sql.Date, Payment_Date || new Date())
      .query(`
        INSERT INTO Payment_Master (Scheme_ID, Customer_ID, Due_number, Received_Flag, Transaction_ID, Amount_Received, Amount_Received_date)
        OUTPUT INSERTED.Pay_ID
        VALUES (@schemeId, @customerId, @dueNumber, 1, @transactionId, @amount, @date)
      `);

    // 2. Update Scheme_Due
    const updateRequest = new sql.Request(transaction);
    await updateRequest
      .input('schemeId', sql.Int, Scheme_ID)
      .input('customerId', sql.VarChar(50), Customer_ID)
      .input('dueNumber', sql.Int, Due_number)
      .input('amount', sql.Decimal(15, 2), Amount_Received)
      .input('date', sql.Date, Payment_Date || new Date())
      .query(`
        UPDATE Scheme_Due 
        SET Recd_amount = ISNULL(Recd_amount, 0) + @amount,
            amt_received_date = @date
        WHERE Scheme_ID = @schemeId AND Customer_ID = @customerId AND Due_number = @dueNumber
      `);

    await transaction.commit();
    res.status(201).json({ message: 'Payment recorded successfully', payId: result.recordset[0].Pay_ID });
  } catch (error) {
    if (transaction.active) await transaction.rollback();
    console.error('❌ recordPayment Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await connection.close();
  }
};

const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, date_from, date_to, customer_id, scheme_id, transaction_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT 
        pm.Pay_ID,
        pm.Customer_ID,
        c.First_Name + ' ' + c.Last_Name as Customer_Name,
        cm.Name as Scheme_Name,
        pm.Amount_Received,
        pm.Amount_Received_date,
        pm.Transaction_ID,
        pm.Due_number
      FROM Payment_Master pm
      JOIN Customer_Master c ON pm.Customer_ID = c.Customer_ID
      JOIN Chit_Master cm ON pm.Scheme_ID = cm.Scheme_ID
    `;

    const params = [];
    const whereClauses = [];
    let paramIndex = 0;

    // Add date range filter
    if (date_from) {
      whereClauses.push(`pm.Amount_Received_date >= @param${paramIndex}`);
      params.push({ value: date_from, type: sql.Date });
      paramIndex++;
    }

    if (date_to) {
      whereClauses.push(`pm.Amount_Received_date <= @param${paramIndex}`);
      params.push({ value: date_to, type: sql.Date });
      paramIndex++;
    }

    // Add customer filter
    if (customer_id) {
      whereClauses.push(`pm.Customer_ID = @param${paramIndex}`);
      params.push({ value: customer_id, type: sql.VarChar(50) });
      paramIndex++;
    }

    // Add scheme filter
    if (scheme_id) {
      whereClauses.push(`pm.Scheme_ID = @param${paramIndex}`);
      params.push({ value: parseInt(scheme_id), type: sql.Int });
      paramIndex++;
    }

    // Add transaction ID filter
    if (transaction_id) {
      whereClauses.push(`pm.Transaction_ID LIKE @param${paramIndex}`);
      params.push({ value: `%${transaction_id}%`, type: sql.VarChar(100) });
      paramIndex++;
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const countQuery = `SELECT COUNT(*) as total FROM Payment_Master pm 
                        JOIN Customer_Master c ON pm.Customer_ID = c.Customer_ID
                        JOIN Chit_Master cm ON pm.Scheme_ID = cm.Scheme_ID
                        ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}`;

    query += ` ORDER BY pm.Amount_Received_date DESC OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;

    const [payments, totalResult] = await Promise.all([
      executeQuery(query, params),
      executeQuery(countQuery, params)
    ]);

    res.json({
      payments,
      pagination: {
        totalRecords: totalResult[0]?.total || 0,
        totalPages: Math.ceil((totalResult[0]?.total || 0) / limit),
        currentPage: parseInt(page),
        pageSize: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ getAllPayments Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getPaymentsByCustomer, recordPayment, getDuesByScheme, getAllPayments };
