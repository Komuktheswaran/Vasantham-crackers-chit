 
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

// Removed getDuesByCustomerAndScheme as we are strictly using Fund Number now

const getDuesByFundNumber = async (req, res) => {
  try {
    const { fundNumber } = req.params;
    const result = await executeQuery(`
      SELECT * FROM Scheme_Due 
      WHERE Fund_Number = @param0
      ORDER BY Due_number ASC
    `, [
      { value: fundNumber, type: sql.VarChar(50) }
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
    // Simplified: Fund Number is now mandatory as per requirement
    const { Fund_Number, Due_number, Transaction_ID, Amount_Received, Payment_Date, Payment_Mode, UPI_Phone_Number } = req.body;
    
    // Validate Fund_Number presence
    if (!Fund_Number) {
         return res.status(400).json({ error: 'Fund Number is required' });
    }

    // Lookup Scheme and Customer from Fund_Number to populate Payment_Master
    // This maintains data integrity (we store IDs) while using Fund_Number as the key
    const lookupReq = new sql.Request(connection);
    const memberCheck = await lookupReq.input('fundNum', sql.VarChar(50), Fund_Number)
        .query('SELECT Customer_ID, Scheme_ID FROM Scheme_Members WHERE Fund_Number = @fundNum');

    if (memberCheck.recordset.length === 0) {
        return res.status(404).json({ error: 'Invalid Fund Number' });
    }

    const { Customer_ID, Scheme_ID } = memberCheck.recordset[0];

    await transaction.begin();

    // 1. Insert into Payment_Master
    const request = new sql.Request(transaction);
    const result = await request
      .input('schemeId', sql.Int, Scheme_ID)
      .input('customerId', sql.VarChar(50), Customer_ID)
      .input('fundNum', sql.VarChar(50), Fund_Number)
      .input('dueNumber', sql.Int, Due_number)
      .input('transactionId', sql.VarChar(50), Transaction_ID || null)
      .input('amount', sql.Decimal(15, 2), Amount_Received)
      .input('date', sql.Date, Payment_Date || new Date())
      .input('paymentMode', sql.VarChar(50), Payment_Mode)
      .input('upiPhone', sql.VarChar(20), UPI_Phone_Number)
      .query(`
        INSERT INTO Payment_Master (Scheme_ID, Customer_ID, Fund_Number, Due_number, Received_Flag, Transaction_ID, Amount_Received, Amount_Received_date, Payment_Mode, UPI_Phone_Number)
        OUTPUT INSERTED.Pay_ID
        VALUES (@schemeId, @customerId, @fundNum, @dueNumber, 1, @transactionId, @amount, @date, @paymentMode, @upiPhone)
      `);

    // 2. Update Scheme_Due using Fund_Number
    const updateRequest = new sql.Request(transaction);
    await updateRequest
      .input('fundNum', sql.VarChar(50), Fund_Number)
      .input('dueNumber', sql.Int, Due_number)
      .input('amount', sql.Decimal(15, 2), Amount_Received)
      .input('date', sql.Date, Payment_Date || new Date())
      .query(`
        UPDATE Scheme_Due 
        SET Recd_amount = ISNULL(Recd_amount, 0) + @amount,
            amt_received_date = @date
        WHERE Fund_Number = @fundNum AND Due_number = @dueNumber
      `);

    await transaction.commit();
    res.status(201).json({ message: 'Payment recorded successfully', payId: result.recordset[0].Pay_ID });
  } catch (error) {
    if (transaction.active) await transaction.rollback();
    console.error('❌ recordPayment Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // await connection.close(); // Main pool handles management usually
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
        c.Name as Customer_Name,
        cm.Name as Scheme_Name,
        pm.Amount_Received,
        pm.Amount_Received_date,
        pm.Transaction_ID,
        pm.Payment_Mode,
        pm.Payment_Mode,
        pm.UPI_Phone_Number,
        pm.Due_number,
        pm.Fund_Number
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

    // Add fund number filter
    if (req.query.fund_number) {
      whereClauses.push(`pm.Fund_Number LIKE @param${paramIndex}`);
      params.push({ value: `%${req.query.fund_number}%`, type: sql.VarChar(50) });
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

const payAllDues = async (req, res) => {
  const connection = await sql.connect(require('../config/database').dbConfig);
  const transaction = new sql.Transaction(connection);

  try {
    const { fundNumber } = req.body;
    
    if (!fundNumber) {
      return res.status(400).json({ error: 'Fund Number is required' });
    }

    // Lookup Member Details
    const lookupReq = new sql.Request(connection);
    const memberCheck = await lookupReq.input('fundNum', sql.VarChar(50), fundNumber)
        .query('SELECT Customer_ID, Scheme_ID FROM Scheme_Members WHERE Fund_Number = @fundNum');

    if (memberCheck.recordset.length === 0) {
        return res.status(404).json({ error: 'Invalid Fund Number' });
    }

    const { Customer_ID, Scheme_ID } = memberCheck.recordset[0];
    
    // Calculate Transaction ID
    const date = new Date();
    const transactionId = `auction_${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}`;

    await transaction.begin();

    // Find all pending dues
    const duesReq = new sql.Request(transaction);
    const pendingDues = await duesReq.input('fundNum', sql.VarChar(50), fundNumber)
        .query(`
            SELECT * FROM Scheme_Due 
            WHERE Fund_Number = @fundNum 
            AND (Recd_amount IS NULL OR Recd_amount < Due_amount)
        `);

    if (pendingDues.recordset.length === 0) {
        await transaction.rollback();
        return res.json({ success: true, message: 'No pending dues found for this Fund Number.' });
    }

    let totalPaid = 0;

    for (const due of pendingDues.recordset) {
        const remainingAmount = due.Due_amount - (due.Recd_amount || 0);
        
        // 1. Insert into Payment_Master
        const insertPayReq = new sql.Request(transaction);
        await insertPayReq
          .input('schemeId', sql.Int, Scheme_ID)
          .input('customerId', sql.VarChar(50), Customer_ID)
          .input('fundNum', sql.VarChar(50), fundNumber)
          .input('dueNumber', sql.Int, due.Due_number)
          .input('transactionId', sql.VarChar(50), transactionId)
          .input('amount', sql.Decimal(15, 2), remainingAmount)
          .input('date', sql.Date, date)
          .input('paymentMode', sql.VarChar(50), 'Auction')
          .query(`
            INSERT INTO Payment_Master (Scheme_ID, Customer_ID, Fund_Number, Due_number, Received_Flag, Transaction_ID, Amount_Received, Amount_Received_date, Payment_Mode)
            VALUES (@schemeId, @customerId, @fundNum, @dueNumber, 1, @transactionId, @amount, @date, @paymentMode)
          `);

        // 2. Update Scheme_Due
        const updateDueReq = new sql.Request(transaction);
        await updateDueReq
          .input('fundNum', sql.VarChar(50), fundNumber)
          .input('dueNumber', sql.Int, due.Due_number)
          .input('amount', sql.Decimal(15, 2), remainingAmount)
          .input('date', sql.Date, date)
          .query(`
            UPDATE Scheme_Due 
            SET Recd_amount = ISNULL(Recd_amount, 0) + @amount,
                amt_received_date = @date
            WHERE Fund_Number = @fundNum AND Due_number = @dueNumber
          `);

        totalPaid += remainingAmount;
    }

    await transaction.commit();
    res.json({ 
        success: true, 
        message: `Successfully paid all dues. Total Amount: ₹${totalPaid}`, 
        transactionId 
    });

  } catch (error) {
    if (transaction.active) await transaction.rollback();
    console.error('❌ payAllDues Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getPaymentsByCustomer, recordPayment, getDuesByFundNumber, getAllPayments, payAllDues };
