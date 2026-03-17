
const { executeQuery, executeInsert } = require('../models/db');
const sql = require('mssql');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { sendWhatsappMessage } = require('../services/whatsappService');
const { generateTransactionId } = require('../utils/idGenerator');

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
    
    return sendSuccess(res, 'Payments fetched successfully', result);
  } catch (error) {
    return sendError(res, 'Failed to fetch payments', error);
  }
};

const getDuesByFundNumber = async (req, res) => {
  try {
    const { fundNumber } = req.params;
    const result = await executeQuery(`
      SELECT * FROM Scheme_Due 
      WHERE Fund_Number LIKE @param0
      ORDER BY Due_number ASC
    `, [
      { value: `%${fundNumber}%`, type: sql.VarChar(50) }
    ]);
    return sendSuccess(res, 'Dues fetched successfully', result);
  } catch (error) {
    return sendError(res, 'Failed to fetch dues', error);
  }
};

const recordPayment = async (req, res) => {
  const connection = await sql.connect(require('../config/database').dbConfig);
  const transaction = new sql.Transaction(connection);

  try {
    // Simplified: Fund Number is now mandatory as per requirement
    console.log('[recordPayment] Request Body:', JSON.stringify(req.body, null, 2));
    const { Fund_Number, Due_number, Transaction_ID, Amount_Received, Payment_Date, Payment_Mode, UPI_Phone_Number, sendWhatsapp } = req.body;
    let { Payment_Transaction_ID } = req.body;
    
    // Always generate a unique ID for the transaction if not provided
    if (!Payment_Transaction_ID) {
      Payment_Transaction_ID = generateTransactionId('PAY');
    }
    
    console.log('[recordPayment] Extracted Fund_Number:', Fund_Number);

    
    // Validate Fund_Number presence
    if (!Fund_Number) {
         return sendError(res, 'Fund Number is required', null, 400);
    }

    // Lookup Scheme and Customer from Fund_Number to populate Payment_Master
    const lookupReq = new sql.Request(connection);
    const memberCheck = await lookupReq.input('fundNum', sql.VarChar(50), Fund_Number)
        .query(`
            SELECT sm.Customer_ID, sm.Scheme_ID, c.Phone_Number, c.Name, cm.Name as Scheme_Name 
            FROM Scheme_Members sm
            JOIN Customer_Master c ON sm.Customer_ID = c.Customer_ID
            JOIN Chit_Master cm ON sm.Scheme_ID = cm.Scheme_ID
            WHERE sm.Fund_Number = @fundNum
        `);

    if (memberCheck.recordset.length === 0) {
        return sendError(res, 'Invalid Fund Number', null, 404);
    }

    const { Customer_ID, Scheme_ID, Phone_Number, Name, Scheme_Name } = memberCheck.recordset[0];

    await transaction.begin();

    // 1. Insert into Payment_Master
    const request = new sql.Request(transaction);
    const result = await request
      .input('schemeId', sql.Int, Scheme_ID)
      .input('customerId', sql.VarChar(50), Customer_ID)
      .input('fundNum', sql.VarChar(50), Fund_Number)
      .input('dueNumber', sql.Int, Due_number)
      .input('paymentTxId', sql.VarChar(50), Payment_Transaction_ID)
      .input('amount', sql.Decimal(15, 2), Amount_Received)
      .input('date', sql.Date, Payment_Date || new Date())
      .input('paymentMode', sql.VarChar(50), Payment_Mode || null)
      .input('upiPhone', sql.VarChar(20), UPI_Phone_Number || null)
      .query(`
        INSERT INTO Payment_Master (Scheme_ID, Customer_ID, Fund_Number, Due_number, Received_Flag, Transaction_ID, Payment_Transaction_ID, Amount_Received, Amount_Received_date, Payment_Mode, UPI_Phone_Number)
        OUTPUT INSERTED.Pay_ID
        VALUES (@schemeId, @customerId, @fundNum, @dueNumber, 1, @paymentTxId, @paymentTxId, @amount, @date, @paymentMode, @upiPhone)
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

    // 📱 Send WhatsApp Notification (Payment Received) 
    if (Phone_Number && sendWhatsapp !== false) {
        sendWhatsappMessage(String(Phone_Number), "payment1", [Name, Amount_Received, Scheme_Name])
            .catch(err => console.error("WA Send Failed (Payment):", err.message));
    }

    return sendSuccess(res, 'Payment recorded successfully', { 
      payId: result.recordset[0].Pay_ID,
      transactionId: Payment_Transaction_ID
    }, 201);
  } catch (error) {
    if (transaction.active) await transaction.rollback();
    return sendError(res, 'Failed to record payment', error);
  } finally {
    // await connection.close(); // Main pool handles management usually
  }
};

const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit, date_from, date_to, customer_id, scheme_id, transaction_id } = req.query;

    let query = `
      SELECT 
        pm.Pay_ID,
        pm.Customer_ID,
        c.Name as Customer_Name,
        cm.Name as Scheme_Name,
        pm.Amount_Received,
        pm.Amount_Received_date,
        pm.Transaction_ID,
        pm.Payment_Transaction_ID,
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
      whereClauses.push(`(pm.Transaction_ID LIKE @param${paramIndex} OR pm.Payment_Transaction_ID LIKE @param${paramIndex})`);
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

    query += ` ORDER BY pm.Fund_Number ASC, pm.Due_number ASC`;
    
    // Only add pagination if limit is provided
    if (limit) {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` OFFSET ${offset} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
    }

    const [payments, totalResult] = await Promise.all([
      executeQuery(query, params),
      executeQuery(countQuery, params)
    ]);

    return sendSuccess(res, 'Payments fetched successfully', {
      payments,
      pagination: {
        totalRecords: totalResult[0]?.total || 0,
        totalPages: limit ? Math.ceil((totalResult[0]?.total || 0) / parseInt(limit)) : 1,
        currentPage: parseInt(page),
        pageSize: limit ? parseInt(limit) : (totalResult[0]?.total || 0)
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch payments', error);
  }
};

const payAllDues = async (req, res) => {
  const connection = await sql.connect(require('../config/database').dbConfig);
  const transaction = new sql.Transaction(connection);

  try {
    const { fundNumber } = req.body;
    
    if (!fundNumber) {
      return sendError(res, 'Fund Number is required', null, 400);
    }

    // Lookup Member Details
    const lookupReq = new sql.Request(connection);
    const memberCheck = await lookupReq.input('fundNum', sql.VarChar(50), fundNumber)
        .query('SELECT Customer_ID, Scheme_ID FROM Scheme_Members WHERE Fund_Number = @fundNum');

    if (memberCheck.recordset.length === 0) {
        return sendError(res, 'Invalid Fund Number', null, 404);
    }

    const { Customer_ID, Scheme_ID } = memberCheck.recordset[0];
    
    // Calculate Transaction ID
    const date = new Date();
    const transactionId = generateTransactionId('PAY-BULK');

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
        return sendSuccess(res, 'No pending dues found for this Fund Number');
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
            INSERT INTO Payment_Master (Scheme_ID, Customer_ID, Fund_Number, Due_number, Received_Flag, Transaction_ID, Payment_Transaction_ID, Amount_Received, Amount_Received_date, Payment_Mode)
            VALUES (@schemeId, @customerId, @fundNum, @dueNumber, 1, @transactionId, @transactionId, @amount, @date, @paymentMode)
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
    return sendSuccess(res, `Successfully paid all dues. Total Amount: ₹${totalPaid}`, { transactionId });

  } catch (error) {
    if (transaction.active) await transaction.rollback();
    return sendError(res, 'Failed to pay all dues', error);
  }
};

const updatePayment = async (req, res) => {
  const connection = await sql.connect(require('../config/database').dbConfig);
  const transaction = new sql.Transaction(connection);

  try {
    const { payId } = req.params;
    const { Amount_Received, Payment_Date, Payment_Mode, Transaction_ID, Payment_Transaction_ID, UPI_Phone_Number } = req.body;

    if (!payId) {
      return sendError(res, 'Payment ID is required', null, 400);
    }

    // 1. Get old payment details to calculate difference
    const lookupReq = new sql.Request(connection);
    const oldPayment = await lookupReq.input('payId', sql.Int, payId)
      .query('SELECT * FROM Payment_Master WHERE Pay_ID = @payId');

    if (oldPayment.recordset.length === 0) {
      return sendError(res, 'Payment record not found', null, 404);
    }

    const oldRecord = oldPayment.recordset[0];
    const amountDiff = parseFloat(Amount_Received) - parseFloat(oldRecord.Amount_Received);

    await transaction.begin();

    // 2. Update Payment_Master
    const updatePayReq = new sql.Request(transaction);
    await updatePayReq
      .input('payId', sql.Int, payId)
      .input('amount', sql.Decimal(15, 2), Amount_Received)
      .input('date', sql.Date, Payment_Date || new Date())
      .input('paymentMode', sql.VarChar(50), Payment_Mode || null)
      .input('transactionId', sql.VarChar(50), Payment_Transaction_ID || Transaction_ID || null)
      .input('upiPhone', sql.VarChar(20), UPI_Phone_Number || null)
      .query(`
        UPDATE Payment_Master 
        SET Amount_Received      = @amount,
            Amount_Received_date = @date,
            Payment_Mode         = @paymentMode,
            Transaction_ID       = @transactionId,
            Payment_Transaction_ID = @transactionId,
            UPI_Phone_Number     = @upiPhone
        WHERE Pay_ID = @payId
      `);

    // 3. Update Scheme_Due (Adjust Recd_amount by difference)
    if (amountDiff !== 0) {
      const updateDueReq = new sql.Request(transaction);
      await updateDueReq
        .input('fundNum', sql.VarChar(50), oldRecord.Fund_Number)
        .input('dueNumber', sql.Int, oldRecord.Due_number)
        .input('diff', sql.Decimal(15, 2), amountDiff)
        .input('date', sql.Date, Payment_Date || new Date())
        .query(`
          UPDATE Scheme_Due 
          SET Recd_amount = ISNULL(Recd_amount, 0) + @diff,
              amt_received_date = @date
          WHERE Fund_Number = @fundNum AND Due_number = @dueNumber
        `);
    }

    await transaction.commit();
    return sendSuccess(res, 'Payment updated successfully');
  } catch (error) {
    if (transaction.active) await transaction.rollback();
    return sendError(res, 'Failed to update payment', error);
  }
};

const getNextReferenceId = async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const prefix = `${year}/`;

    // Find the max sequential number used this year from Payment_Transaction_ID
    const result = await executeQuery(`
      SELECT MAX(CAST(SUBSTRING(Payment_Transaction_ID, LEN(@prefix) + 1, 10) AS INT)) AS MaxSeq
      FROM Payment_Master
      WHERE Payment_Transaction_ID LIKE @prefixPattern
        AND ISNUMERIC(SUBSTRING(Payment_Transaction_ID, LEN(@prefix) + 1, 10)) = 1
    `, [
      { value: prefix, type: sql.VarChar(20), name: 'prefix' },
      { value: `${prefix}%`, type: sql.VarChar(30), name: 'prefixPattern' }
    ]);

    const maxSeq = result[0]?.MaxSeq || 0;
    const nextSeq = String(maxSeq + 1).padStart(5, '0');
    const nextRefId = `${year}/${nextSeq}`;

    return sendSuccess(res, 'Next reference ID generated', { referenceId: nextRefId });
  } catch (error) {
    return sendError(res, 'Failed to generate reference ID', error);
  }
};

module.exports = { 
  getPaymentsByCustomer, 
  recordPayment, 
  getDuesByFundNumber, 
  getAllPayments, 
  payAllDues, 
  updatePayment,
  getNextReferenceId
};
