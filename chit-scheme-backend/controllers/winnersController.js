const { executeQuery } = require('../models/db');
const sql = require('mssql');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { generateTransactionId } = require('../utils/idGenerator');

// Prize for each place is authoritative on the server — the client only sends
// the Place + Fund_Number, never the prize text.
const PRIZES = {
  1: '100% discount on remaining month dues',
  2: '60 items Gift Box x 1',
  3: '50 items Gift Box x 1',
};

// -------------------------------------------------------
// GET /api/winners?month=YYYY-MM
// Returns all declared winners, newest month first, place ascending.
// -------------------------------------------------------
const getWinners = async (req, res) => {
  try {
    const { month } = req.query;

    const params = [];
    let whereStr = '';
    if (month) {
      whereStr = 'WHERE Win_Month = @param0';
      params.push({ value: month, type: sql.VarChar(7) });
    }

    const rows = await executeQuery(`
      SELECT
        Winner_ID,
        Win_Month,
        Place,
        Fund_Number,
        Customer_ID,
        Customer_Name,
        Scheme_ID,
        Scheme_Name,
        Prize,
        Discount_amount,
        Auction_Transaction_ID,
        Created_at,
        Updated_at
      FROM Monthly_Winners
      ${whereStr}
      ORDER BY Win_Month DESC, Place ASC
    `, params);

    return sendSuccess(res, 'Winners fetched successfully', rows);
  } catch (error) {
    return sendError(res, 'Failed to fetch winners', error);
  }
};

// -------------------------------------------------------
// POST /api/winners
// Body: { Win_Month: 'YYYY-MM', winners: [{ Place, Fund_Number }, ...] }
// One global set per month — saving overwrites that month's winners.
// Place 1 ("100% discount") auto-waives the winner's remaining Scheme_Due
// (same effect as Pay All) and records the waived amount as an Auction discount.
// -------------------------------------------------------
const saveWinners = async (req, res) => {
  const { Win_Month, winners } = req.body;

  if (!Win_Month || !/^\d{4}-\d{2}$/.test(Win_Month)) {
    return sendError(res, 'Win_Month is required in YYYY-MM format', null, 400);
  }
  if (!Array.isArray(winners) || winners.length === 0) {
    return sendError(res, 'At least one winner is required', null, 400);
  }

  // Validate each entry up-front so we never start a partial transaction.
  const seenPlaces = new Set();
  for (const w of winners) {
    const place = parseInt(w.Place, 10);
    if (![1, 2, 3].includes(place)) {
      return sendError(res, `Invalid place: ${w.Place}. Must be 1, 2 or 3.`, null, 400);
    }
    if (seenPlaces.has(place)) {
      return sendError(res, `Duplicate entry for place ${place}.`, null, 400);
    }
    seenPlaces.add(place);
    if (!w.Fund_Number || !String(w.Fund_Number).trim()) {
      return sendError(res, `Fund Number is required for place ${place}.`, null, 400);
    }
  }

  const connection = await sql.connect(require('../config/database').dbConfig);
  const transaction = new sql.Transaction(connection);

  try {
    // 1. Resolve every fund number to a member BEFORE mutating anything.
    const resolved = [];
    for (const w of winners) {
      const place = parseInt(w.Place, 10);
      const fundNumber = String(w.Fund_Number).trim();

      const lookupReq = new sql.Request(connection);
      const memberResult = await lookupReq
        .input('fundNum', sql.VarChar(50), fundNumber)
        .query(`
          SELECT sm.Membership_ID, sm.Customer_ID, sm.Scheme_ID,
                 c.Name AS Customer_Name, cm.Name AS Scheme_Name
          FROM Scheme_Members sm
          JOIN Customer_Master c ON sm.Customer_ID = c.Customer_ID
          JOIN Chit_Master cm    ON sm.Scheme_ID   = cm.Scheme_ID
          WHERE sm.Fund_Number = @fundNum
        `);

      if (memberResult.recordset.length === 0) {
        return sendError(res, `Fund Number not found for place ${place}: ${fundNumber}`, null, 404);
      }

      resolved.push({ place, fundNumber, member: memberResult.recordset[0] });
    }

    await transaction.begin();

    // 2. Clear any previously declared winners for this month (overwrite).
    await new sql.Request(transaction)
      .input('month', sql.VarChar(7), Win_Month)
      .query('DELETE FROM Monthly_Winners WHERE Win_Month = @month');

    const savedWinners = [];

    for (const { place, fundNumber, member } of resolved) {
      const prize = PRIZES[place];
      let discountAmount = null;
      let auctionTxId = null;

      // 3. Place 1 → 100% discount: auto-waive all remaining dues.
      if (place === 1) {
        auctionTxId = generateTransactionId('AUC');
        const today = new Date();

        const duesReq = new sql.Request(transaction);
        const pendingDues = await duesReq
          .input('fundNum', sql.VarChar(50), fundNumber)
          .query(`
            SELECT * FROM Scheme_Due
            WHERE Fund_Number = @fundNum
            AND (Recd_amount IS NULL OR Recd_amount < Due_amount)
          `);

        let totalWaived = 0;
        for (const due of pendingDues.recordset) {
          const remaining = due.Due_amount - (due.Recd_amount || 0);
          if (remaining <= 0) continue;

          // Mark the due as received via Payment_Master (mode = Auction Prize).
          await new sql.Request(transaction)
            .input('schemeId', sql.Int, member.Scheme_ID)
            .input('customerId', sql.VarChar(50), member.Customer_ID)
            .input('fundNum', sql.VarChar(50), fundNumber)
            .input('dueNumber', sql.Int, due.Due_number)
            .input('transactionId', sql.VarChar(50), auctionTxId)
            .input('amount', sql.Decimal(15, 2), remaining)
            .input('date', sql.Date, today)
            .input('paymentMode', sql.VarChar(50), 'Auction Prize')
            .query(`
              MERGE Payment_Master AS target
              USING (SELECT @fundNum AS Fund_Number, @dueNumber AS Due_number) AS source
              ON (target.Fund_Number = source.Fund_Number AND target.Due_number = source.Due_number)
              WHEN MATCHED THEN
                  UPDATE SET
                      Amount_Received = target.Amount_Received + @amount,
                      Amount_Received_date = @date,
                      Payment_Mode = @paymentMode,
                      Payment_Transaction_ID = @transactionId
              WHEN NOT MATCHED THEN
                  INSERT (Scheme_ID, Customer_ID, Fund_Number, Due_number, Received_Flag, Transaction_ID, Payment_Transaction_ID, Amount_Received, Amount_Received_date, Payment_Mode)
                  VALUES (@schemeId, @customerId, @fundNum, @dueNumber, 1, @transactionId, @transactionId, @amount, @date, @paymentMode);
            `);

          await new sql.Request(transaction)
            .input('fundNum', sql.VarChar(50), fundNumber)
            .input('dueNumber', sql.Int, due.Due_number)
            .input('amount', sql.Decimal(15, 2), remaining)
            .input('date', sql.Date, today)
            .query(`
              UPDATE Scheme_Due
              SET Recd_amount = ISNULL(Recd_amount, 0) + @amount,
                  amt_received_date = @date
              WHERE Fund_Number = @fundNum AND Due_number = @dueNumber
            `);

          totalWaived += remaining;
        }

        discountAmount = totalWaived;

        // Record the waiver in Auctions so it shows in auction history too.
        if (totalWaived > 0) {
          await new sql.Request(transaction)
            .input('membershipId', sql.Int, member.Membership_ID)
            .input('discountAmount', sql.Decimal(18, 2), totalWaived)
            .input('auctionDate', sql.Date, today)
            .input('auctionTxId', sql.VarChar(50), auctionTxId)
            .query(`
              INSERT INTO Auctions (Membership_ID, Discount_amount, Auction_date, Auction_Transaction_ID, Created_at, Updated_at)
              VALUES (@membershipId, @discountAmount, @auctionDate, @auctionTxId, GETDATE(), GETDATE())
            `);
        }
      }

      // 4. Persist the winner row.
      await new sql.Request(transaction)
        .input('month', sql.VarChar(7), Win_Month)
        .input('place', sql.Int, place)
        .input('fundNum', sql.VarChar(50), fundNumber)
        .input('customerId', sql.VarChar(50), member.Customer_ID)
        .input('customerName', sql.VarChar(255), member.Customer_Name || null)
        .input('schemeId', sql.Int, member.Scheme_ID)
        .input('schemeName', sql.VarChar(255), member.Scheme_Name || null)
        .input('prize', sql.NVarChar(255), prize)
        .input('discountAmount', sql.Decimal(18, 2), discountAmount)
        .input('auctionTxId', sql.VarChar(50), auctionTxId)
        .query(`
          INSERT INTO Monthly_Winners
            (Win_Month, Place, Fund_Number, Customer_ID, Customer_Name, Scheme_ID, Scheme_Name, Prize, Discount_amount, Auction_Transaction_ID, Created_at, Updated_at)
          VALUES
            (@month, @place, @fundNum, @customerId, @customerName, @schemeId, @schemeName, @prize, @discountAmount, @auctionTxId, GETDATE(), GETDATE())
        `);

      savedWinners.push({
        Place: place,
        Fund_Number: fundNumber,
        Customer_ID: member.Customer_ID,
        Customer_Name: member.Customer_Name,
        Scheme_Name: member.Scheme_Name,
        Prize: prize,
        Discount_amount: discountAmount,
      });
    }

    await transaction.commit();

    return sendSuccess(res, `Winners saved for ${Win_Month}`, {
      Win_Month,
      winners: savedWinners,
    }, 201);
  } catch (error) {
    if (transaction.active) await transaction.rollback();
    return sendError(res, 'Failed to save winners', error);
  } finally {
    await connection.close();
  }
};

// -------------------------------------------------------
// DELETE /api/winners/:month   (month = YYYY-MM)
// Removes the winner records for a month. Does NOT reverse any dues that
// were already waived for a 1st-place winner.
// -------------------------------------------------------
const deleteWinners = async (req, res) => {
  try {
    const { month } = req.params;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return sendError(res, 'Month must be in YYYY-MM format', null, 400);
    }

    const connection = await sql.connect(require('../config/database').dbConfig);
    try {
      await new sql.Request(connection)
        .input('month', sql.VarChar(7), month)
        .query('DELETE FROM Monthly_Winners WHERE Win_Month = @month');
      return sendSuccess(res, `Winners removed for ${month}`);
    } finally {
      await connection.close();
    }
  } catch (error) {
    return sendError(res, 'Failed to delete winners', error);
  }
};

module.exports = {
  getWinners,
  saveWinners,
  deleteWinners,
};
