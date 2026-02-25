
const { executeQuery } = require('../models/db');
const sql = require('mssql');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// -------------------------------------------------------
// POST /api/auctions
// Body: { Membership_ID, Discount_amount, Auction_date }
// Resolves Customer_ID from Scheme_Members automatically.
// Auctions table has NO Customer_ID column — linked only via Membership_ID.
// -------------------------------------------------------
const createAuction = async (req, res) => {
  const connection = await sql.connect(require('../config/database').dbConfig);
  const transaction = new sql.Transaction(connection);

  try {
    const { Membership_ID, Discount_amount, Auction_date } = req.body;

    if (!Membership_ID) {
      return sendError(res, 'Membership_ID is required', null, 400);
    }
    if (!Discount_amount) {
      return sendError(res, 'Discount_amount is required', null, 400);
    }

    // 1. Verify Membership_ID exists
    const lookupReq = new sql.Request(connection);
    const memberResult = await lookupReq
      .input('membershipId', sql.Int, parseInt(Membership_ID))
      .query(`
        SELECT sm.Membership_ID, sm.Customer_ID
        FROM Scheme_Members sm
        WHERE sm.Membership_ID = @membershipId
      `);

    if (memberResult.recordset.length === 0) {
      return sendError(res, 'Membership_ID not found', null, 404);
    }

    await transaction.begin();

    // 2. Insert into Auctions (no Customer_ID column in table)
    const insertReq = new sql.Request(transaction);
    const insertResult = await insertReq
      .input('membershipId', sql.Int, parseInt(Membership_ID))
      .input('discountAmount', sql.Decimal(18, 2), parseFloat(Discount_amount))
      .input('auctionDate', sql.Date, Auction_date || new Date())
      .query(`
        INSERT INTO Auctions (Membership_ID, Discount_amount, Auction_date, Created_at, Updated_at)
        OUTPUT INSERTED.Auction_ID
        VALUES (@membershipId, @discountAmount, @auctionDate, GETDATE(), GETDATE())
      `);

    await transaction.commit();

    return sendSuccess(res, 'Auction created successfully', {
      auctionId: insertResult.recordset[0].Auction_ID
    }, 201);

  } catch (error) {
    if (transaction.active) await transaction.rollback();
    return sendError(res, 'Failed to create auction', error);
  } finally {
    await connection.close();
  }
};

// -------------------------------------------------------
// GET /api/auctions
// Query: { membership_id, customer_id, page, limit }
// -------------------------------------------------------
const getAuctions = async (req, res) => {
  try {
    const { page = 1, limit, membership_id, customer_id } = req.query;

    const params = [];
    const whereClauses = [];
    let paramIndex = 0;

    if (membership_id) {
      whereClauses.push(`a.Membership_ID = @param${paramIndex}`);
      params.push({ value: parseInt(membership_id), type: sql.Int });
      paramIndex++;
    }

    if (customer_id) {
      whereClauses.push(`sm.Customer_ID = @param${paramIndex}`);
      params.push({ value: customer_id, type: sql.VarChar(50) });
      paramIndex++;
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let query = `
      SELECT
        a.Auction_ID,
        a.Membership_ID,
        sm.Customer_ID,
        c.Name    AS Customer_Name,
        cm.Name   AS Scheme_Name,
        a.Discount_amount,
        a.Auction_date,
        a.Created_at,
        a.Updated_at
      FROM Auctions a
      JOIN Scheme_Members sm ON a.Membership_ID = sm.Membership_ID
      JOIN Customer_Master c  ON sm.Customer_ID  = c.Customer_ID
      JOIN Chit_Master     cm ON sm.Scheme_ID    = cm.Scheme_ID
      ${whereStr}
      ORDER BY a.Auction_date DESC, a.Auction_ID DESC
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM Auctions a
      JOIN Scheme_Members sm ON a.Membership_ID = sm.Membership_ID
      ${whereStr}
    `;

    if (limit) {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` OFFSET ${offset} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
    }

    const [auctions, totalResult] = await Promise.all([
      executeQuery(query, params),
      executeQuery(countQuery, params)
    ]);

    return sendSuccess(res, 'Auctions fetched successfully', {
      auctions,
      pagination: {
        totalRecords: totalResult[0]?.total || 0,
        totalPages: limit ? Math.ceil((totalResult[0]?.total || 0) / parseInt(limit)) : 1,
        currentPage: parseInt(page),
        pageSize: limit ? parseInt(limit) : (totalResult[0]?.total || 0)
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch auctions', error);
  }
};

// -------------------------------------------------------
// GET /api/auctions/by-membership/:membershipId
// -------------------------------------------------------
const getAuctionsByMembership = async (req, res) => {
  try {
    const { membershipId } = req.params;

    const result = await executeQuery(`
      SELECT
        a.Auction_ID,
        a.Membership_ID,
        sm.Customer_ID,
        c.Name    AS Customer_Name,
        cm.Name   AS Scheme_Name,
        a.Discount_amount,
        a.Auction_date,
        a.Created_at,
        a.Updated_at
      FROM Auctions a
      JOIN Scheme_Members sm ON a.Membership_ID = sm.Membership_ID
      JOIN Customer_Master c  ON sm.Customer_ID  = c.Customer_ID
      JOIN Chit_Master     cm ON sm.Scheme_ID    = cm.Scheme_ID
      WHERE a.Membership_ID = @param0
      ORDER BY a.Auction_date DESC
    `, [{ value: parseInt(membershipId), type: sql.Int }]);

    return sendSuccess(res, 'Auctions fetched for membership', result);
  } catch (error) {
    return sendError(res, 'Failed to fetch auctions by membership', error);
  }
};

// -------------------------------------------------------
// PUT /api/auctions/:id
// Body: { Discount_amount, Auction_date }
// -------------------------------------------------------
const updateAuction = async (req, res) => {
  try {
    const { id } = req.params;
    const { Discount_amount, Auction_date } = req.body;

    const existing = await executeQuery(
      'SELECT Auction_ID FROM Auctions WHERE Auction_ID = @param0',
      [{ value: parseInt(id), type: sql.Int }]
    );

    if (existing.length === 0) {
      return sendError(res, 'Auction not found', null, 404);
    }

    const connection = await sql.connect(require('../config/database').dbConfig);
    try {
      const updateReq = new sql.Request(connection);
      await updateReq
        .input('auctionId', sql.Int, parseInt(id))
        .input('discountAmount', sql.Decimal(18, 2), parseFloat(Discount_amount))
        .input('auctionDate', sql.Date, Auction_date || new Date())
        .query(`
          UPDATE Auctions
          SET Discount_amount = @discountAmount,
              Auction_date    = @auctionDate,
              Updated_at      = GETDATE()
          WHERE Auction_ID = @auctionId
        `);

      return sendSuccess(res, 'Auction updated successfully');
    } finally {
      await connection.close();
    }
  } catch (error) {
    return sendError(res, 'Failed to update auction', error);
  }
};

// -------------------------------------------------------
// DELETE /api/auctions/:id
// -------------------------------------------------------
const deleteAuction = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await executeQuery(
      'SELECT Auction_ID FROM Auctions WHERE Auction_ID = @param0',
      [{ value: parseInt(id), type: sql.Int }]
    );

    if (existing.length === 0) {
      return sendError(res, 'Auction not found', null, 404);
    }

    const connection = await sql.connect(require('../config/database').dbConfig);
    try {
      const deleteReq = new sql.Request(connection);
      await deleteReq
        .input('auctionId', sql.Int, parseInt(id))
        .query('DELETE FROM Auctions WHERE Auction_ID = @auctionId');

      return sendSuccess(res, 'Auction deleted successfully');
    } finally {
      await connection.close();
    }
  } catch (error) {
    return sendError(res, 'Failed to delete auction', error);
  }
};

module.exports = {
  createAuction,
  getAuctions,
  getAuctionsByMembership,
  updateAuction,
  deleteAuction
};
