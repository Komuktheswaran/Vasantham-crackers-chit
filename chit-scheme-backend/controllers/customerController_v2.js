const { executeQuery, executeInsertGetId, executeUpdate } = require('../models/db');
const sql = require('mssql');
const { convertToCsv, parseExcel } = require('../utils');
const xlsx = require('xlsx');
const path = require('path');
const { sendWhatsappMessage } = require('../services/whatsappService');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// Helper to generate Customer ID in format: CD2026/001
// When called with a transaction, uses UPDLOCK+HOLDLOCK to prevent duplicate IDs under concurrency.
const generateCustomerId = async (txn = null) => {
  const year = new Date().getFullYear();
  const prefix = `CD${year}/`;

  let result;
  if (txn) {
    const req = new sql.Request(txn);
    const r = await req
      .input('prefix', sql.VarChar(20), `${prefix}%`)
      .query(`SELECT TOP 1 Customer_ID FROM Customer_Master WITH (UPDLOCK, HOLDLOCK) WHERE Customer_ID LIKE @prefix ORDER BY LEN(Customer_ID) DESC, Customer_ID DESC`);
    result = r.recordset;
  } else {
    result = await executeQuery(
      `SELECT TOP 1 Customer_ID FROM Customer_Master WHERE Customer_ID LIKE @param0 ORDER BY LEN(Customer_ID) DESC, Customer_ID DESC`,
      [{ value: `${prefix}%`, type: sql.VarChar }]
    );
  }

  let nextNumber = 1;
  if (result.length > 0) {
    const match = result[0].Customer_ID.match(/\/(\d+)$/);
    if (match) nextNumber = parseInt(match[1]) + 1;
  }
  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
};

// Helper to generate Fund Number in format: F2026/001
// When called with a transaction, uses UPDLOCK+HOLDLOCK to prevent duplicate Fund Numbers under concurrency.
const generateFundNumber = async (txn = null) => {
  const year = new Date().getFullYear();
  const prefix = `F${year}/`;

  let result;
  if (txn) {
    const req = new sql.Request(txn);
    const r = await req
      .input('prefix', sql.VarChar(20), `${prefix}%`)
      .query(`SELECT TOP 1 Fund_Number FROM Scheme_Members WITH (UPDLOCK, HOLDLOCK) WHERE Fund_Number LIKE @prefix ORDER BY LEN(Fund_Number) DESC, Fund_Number DESC`);
    result = r.recordset;
  } else {
    result = await executeQuery(
      `SELECT TOP 1 Fund_Number FROM Scheme_Members WHERE Fund_Number LIKE @param0 ORDER BY LEN(Fund_Number) DESC, Fund_Number DESC`,
      [{ value: `${prefix}%`, type: sql.VarChar }]
    );
  }

  let nextNumber = 1;
  if (result.length > 0) {
    const match = result[0].Fund_Number.match(/\/(\d+)$/);
    if (match) nextNumber = parseInt(match[1]) + 1;
  }
  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
};

const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit, search = '', state, district, area, scheme_id, customer_type, Customer_Type, fund_number } = req.query;
    let { sort_field = 'Created_At', sort_order = 'DESC' } = req.query;

    // Validate sort order against a fixed set — never interpolate raw user input
    sort_order = ['ASC', 'DESC'].includes((sort_order || '').toUpperCase()) ? sort_order.toUpperCase() : 'DESC';

    // Map allowed sort fields to safe qualified column expressions
    const sortFieldMap = {
      'Customer_ID':   'c.Customer_ID',
      'Customer_Code': 'c.Customer_Code',
      'Name':          'c.Name',
      'Phone_Number':  'c.Phone_Number',
      'Customer_Type': 'c.Customer_Type',
      'Address1':      'c.Address1',
      'District_Name': 'd.District_Name',
      'State_Name':    's.State_Name',
      'Created_At':    'c.Created_At',
    };
    const safeSortField = sortFieldMap[sort_field] || 'c.Created_At';

    // Build base query
    let baseQuery = `
      SELECT c.Customer_ID, c.Customer_Code, c.Name, c.Reference_Code, c.Delivery_Point_ID, c.Customer_Type,
             c.Phone_Number, c.Phone_Number2, c.Area, c.State_ID, c.District_ID, c.Pincode,
             c.Address1, c.Address2, c.Created_At,
             ISNULL(d.District_Name, 'N/A') as District_Name,
             ISNULL(s.State_Name, 'N/A') as State_Name
    `;
    
    let fromQuery = `
      FROM Customer_Master c 
      LEFT JOIN District_Master d ON c.District_ID = d.District_ID 
      LEFT JOIN State_Master s ON c.State_ID = s.State_ID
    `;
    
    if (scheme_id || fund_number) {
      fromQuery += ` INNER JOIN Scheme_Members sm ON c.Customer_ID = sm.Customer_ID`;
    }

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 0;

    // Search functionality - Updated for Name, Phone, omer Code, omer ID, and Fund Number
    if (search) {
      whereClause += ` AND (
        c.Name LIKE @param${paramIndex} 
        OR CAST(c.Phone_Number AS VARCHAR(20)) LIKE @param${paramIndex}
        OR c.Customer_Code LIKE @param${paramIndex}
        OR c.Customer_ID LIKE @param${paramIndex}
        OR EXISTS (
          SELECT 1 FROM Scheme_Members sm 
          WHERE sm.Customer_ID = c.Customer_ID 
          AND sm.Fund_Number LIKE @param${paramIndex}
        )
      )`;
      params.push({ value: `%${search}%`, type: sql.VarChar });
      paramIndex++;
    }

    // State, District, Area, Scheme filters
    if (state) {
      whereClause += ` AND s.State_Name = @param${paramIndex}`;
      params.push({ value: state, type: sql.VarChar(100) });
      paramIndex++;
    }
    if (district) {
      whereClause += ` AND d.District_Name = @param${paramIndex}`;
      params.push({ value: district, type: sql.VarChar(100) });
      paramIndex++;
    }
    if (area) {
      whereClause += ` AND c.Area LIKE @param${paramIndex}`;
      params.push({ value: `%${area}%`, type: sql.VarChar(100) });
      paramIndex++;
    }
    if (scheme_id) {
      whereClause += ` AND sm.Scheme_ID = @param${paramIndex}`;
      params.push({ value: parseInt(scheme_id), type: sql.Int });
      paramIndex++;
    }
    if (fund_number) {
      whereClause += ` AND (sm.Fund_Number = @param${paramIndex} OR sm.Fund_Number LIKE @param${paramIndex + 1})`;
      params.push({ value: fund_number, type: sql.VarChar });
      params.push({ value: `%/${fund_number}`, type: sql.VarChar });
      paramIndex += 2;
    }
    const cType = Customer_Type || customer_type;
    if (cType) {
        // Handle filter for multiple types if sent as array, or single partial match
        // Assuming simple string match for now as stored in CSV
        whereClause += ` AND c.Customer_Type LIKE @param${paramIndex}`;
        params.push({ value: `%${cType}%`, type: sql.VarChar });
        paramIndex++;
    }

    if (req.query.has_scheme === 'true') {
        whereClause += ` AND EXISTS (SELECT 1 FROM Scheme_Members sm WHERE sm.Customer_ID = c.Customer_ID)`;
    }

    // Reference Code filter (supports single value or multiple)
    const { ref_codes } = req.query;
    if (ref_codes) {
        const codes = Array.isArray(ref_codes) ? ref_codes : ref_codes.split(',');
        if (codes.length > 0) {
            const codeParams = codes.map((_, i) => `@refCode${i}`).join(',');
            whereClause += ` AND c.Reference_Code IN (${codeParams})`;
            codes.forEach((code, i) => {
                params.push({ name: `refCode${i}`, value: code, type: sql.VarChar });
            });
        }
    }

    // Pre-aggregated JOINs — computed once per table scan instead of once per row
    const aggregateJoins = `
      LEFT JOIN (
        SELECT Customer_ID, COUNT(*) AS total_schemes
        FROM Scheme_Members
        GROUP BY Customer_ID
      ) sm_counts ON c.Customer_ID = sm_counts.Customer_ID
      LEFT JOIN (
        SELECT sm2.Customer_ID, STRING_AGG(cm.Name, ', ') AS Assigned_Schemes
        FROM Scheme_Members sm2
        JOIN Chit_Master cm ON sm2.Scheme_ID = cm.Scheme_ID
        GROUP BY sm2.Customer_ID
      ) sm_agg ON c.Customer_ID = sm_agg.Customer_ID
      LEFT JOIN (
        SELECT Customer_ID, COUNT(*) AS total_payments
        FROM Payment_Master
        GROUP BY Customer_ID
      ) pm_counts ON c.Customer_ID = pm_counts.Customer_ID
    `;

    let customersQuery = `
      ${baseQuery},
       ISNULL(sm_counts.total_schemes, 0) as total_schemes,
       ISNULL(sm_agg.Assigned_Schemes, '') as Assigned_Schemes,
       ISNULL(pm_counts.total_payments, 0) as total_payments
      ${fromQuery}
      ${aggregateJoins}
      ${whereClause}
      ORDER BY ${safeSortField} ${sort_order}
    `;

    // Only add pagination if limit is provided
    if (limit) {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      customersQuery += ` OFFSET ${offset} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
    }

    const totalQuery = `
      SELECT COUNT(DISTINCT c.Customer_ID) as total
      ${fromQuery}
      ${whereClause}
    `;

    // Run data and count queries in parallel — independent queries, no reason to await sequentially
    const [customers, totalResult] = await Promise.all([
      executeQuery(customersQuery, params),
      executeQuery(totalQuery, params),
    ]);

    return sendSuccess(res, 'Customers fetched successfully', {
      customers,
      pagination: {
        totalRecords: totalResult[0]?.total || 0,
        totalPages: limit ? Math.ceil((totalResult[0]?.total || 0) / parseInt(limit)) : 1,
        currentPage: parseInt(page),
        pageSize: limit ? parseInt(limit) : (totalResult[0]?.total || 0)
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch customers', error);
  }
};

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Updated to select * but explicitly ensure Name is returned
    const customer = await executeQuery(`
      SELECT c.*, d.District_Name, s.State_Name
      FROM Customer_Master c 
      LEFT JOIN District_Master d ON c.District_ID = d.District_ID 
      LEFT JOIN State_Master s ON c.State_ID = s.State_ID
      WHERE c.Customer_ID = @param0
    `, [{ value: id, type: sql.VarChar(50) }]);

    if (!customer.length) {
      return sendError(res, 'Customer not found', null, 404);
    }

    return sendSuccess(res, 'Customer details fetched successfully', customer[0]);
  } catch (error) {
    return sendError(res, 'Failed to fetch customer details', error);
  }
};

const createCustomer = async (req, res) => {
  const { getPool } = require('../models/db');
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    let {
      Customer_ID,
      Customer_Code,
      Name,
      Reference_Code,
      Customer_Type,
      PhoneNumber,
      PhoneNumber2,
      Address1,
      Address2,
      StreetAddress1,
      StreetAddress2,
      Area,
      District_ID,
      State_ID,
      Pincode,
      Scheme_ID,
      Fund_Number,
      Delivery_Point_ID,
      sendWhatsapp
    } = req.body;

    const finalAddress1 = Address1 || StreetAddress1;
    const finalAddress2 = Address2 || StreetAddress2;

    await transaction.begin();

    // Auto-generate Customer_ID inside the transaction — UPDLOCK prevents duplicate IDs
    if (!Customer_ID) {
      Customer_ID = await generateCustomerId(transaction);
    }

    // 1. Insert Customer
    const insertReq = new sql.Request(transaction);
    insertReq.input('Customer_ID', sql.VarChar(50), Customer_ID);
    insertReq.input('Customer_Code', sql.VarChar(100), Customer_Code || '');
    insertReq.input('Name', sql.VarChar(255), Name);
    insertReq.input('Reference_Code', sql.VarChar(100), Reference_Code || '');
    insertReq.input('Customer_Type', sql.VarChar(100), Customer_Type || '');
    insertReq.input('Phone_Number', sql.VarChar(20), PhoneNumber ? String(PhoneNumber) : null);
    insertReq.input('Phone_Number2', sql.VarChar(20), PhoneNumber2 ? String(PhoneNumber2) : null);
    insertReq.input('Address1', sql.VarChar(500), finalAddress1 || '');
    insertReq.input('Address2', sql.VarChar(500), finalAddress2 || '');
    insertReq.input('Area', sql.VarChar(255), Area || '');
    insertReq.input('District_ID', sql.Int, District_ID || null);
    insertReq.input('State_ID', sql.Int, State_ID || null);
    insertReq.input('Pincode', sql.Int, Pincode || null);
    insertReq.input('Delivery_Point_ID', sql.Int, Delivery_Point_ID || null);

    await insertReq.query(`
      INSERT INTO Customer_Master (
        Customer_ID, Customer_Code, Name, Reference_Code, Customer_Type,
        Phone_Number, Phone_Number2, Address1, Address2,
        Area, District_ID, State_ID, Pincode, Delivery_Point_ID, Created_At
      )
      VALUES (
        @Customer_ID, @Customer_Code, @Name, @Reference_Code, @Customer_Type,
        @Phone_Number, @Phone_Number2, @Address1, @Address2,
        @Area, @District_ID, @State_ID, @Pincode, @Delivery_Point_ID, GETDATE()
      )
    `);

    // 2. Assign Schemes (Single or Multiple)
    let schemesToAssign = [];
    if (req.body.Schemes && Array.isArray(req.body.Schemes)) {
      schemesToAssign = req.body.Schemes;
    } else if (Scheme_ID) {
      schemesToAssign.push({ schemeId: Scheme_ID, fundNumber: Fund_Number });
    }

    if (schemesToAssign.length > 0) {
      // Build a single bulk table for all dues across all schemes
      const duesTable = new sql.Table('Scheme_Due');
      duesTable.create = false;
      duesTable.columns.add('Scheme_ID', sql.Int, { nullable: false });
      duesTable.columns.add('Due_number', sql.Int, { nullable: false });
      duesTable.columns.add('Due_date', sql.Date, { nullable: true });
      duesTable.columns.add('Due_amount', sql.Decimal(15, 2), { nullable: true });
      duesTable.columns.add('Recd_amount', sql.Decimal(15, 2), { nullable: true });
      duesTable.columns.add('amt_received_date', sql.Date, { nullable: true });
      duesTable.columns.add('Customer_ID', sql.VarChar(50), { nullable: false });
      duesTable.columns.add('Fund_Number', sql.VarChar(50), { nullable: true });

      for (const schemeItem of schemesToAssign) {
        const schemeId = schemeItem.schemeId;
        // Fund number generation inside transaction — UPDLOCK prevents duplicates
        const fundNum = schemeItem.fundNumber || await generateFundNumber(transaction);

        // Insert Scheme Member
        const assignReq = new sql.Request(transaction);
        await assignReq
          .input('customerId', sql.VarChar(50), Customer_ID)
          .input('schemeId', sql.Int, schemeId)
          .input('fundNum', sql.VarChar(50), fundNum)
          .query(`INSERT INTO Scheme_Members (Customer_ID, Scheme_ID, Fund_Number, Status, Join_date, Created_at, Updated_at)
                  VALUES (@customerId, @schemeId, @fundNum, 'Active', GETDATE(), GETDATE(), GETDATE())`);

        // Fetch scheme details
        const schemeDetailsReq = new sql.Request(transaction);
        const schemeResult = await schemeDetailsReq
          .input('schemeId', sql.Int, schemeId)
          .query('SELECT Amount_per_month, Number_of_due, Month_from FROM Chit_Master WHERE Scheme_ID = @schemeId');

        const scheme = schemeResult.recordset[0];
        if (scheme) {
          for (let i = 1; i <= scheme.Number_of_due; i++) {
            const dueDate = new Date(scheme.Month_from);
            dueDate.setMonth(dueDate.getMonth() + (i - 1));
            dueDate.setDate(10);
            duesTable.rows.add(schemeId, i, dueDate, scheme.Amount_per_month, null, null, Customer_ID, fundNum);
          }
        }
      }

      // Bulk insert all dues in one trip instead of one INSERT per due
      if (duesTable.rows.length > 0) {
        const bulkReq = new sql.Request(transaction);
        await bulkReq.bulk(duesTable);
      }
    }

    await transaction.commit();

    // Send WhatsApp only when explicitly requested (opt-in, not opt-out)
    if (PhoneNumber && sendWhatsapp === true) {
      sendWhatsappMessage(String(PhoneNumber), 'welcomecccc', [String(Customer_ID), Name], Name)
        .catch(err => console.error('WA Send Failed (Create Customer):', err.message));
    }

    return sendSuccess(res, 'Customer created successfully', { customerId: Customer_ID }, 201);
  } catch (error) {
    if (transaction.active) await transaction.rollback().catch(() => {});
    return sendError(res, 'Failed to create customer', error);
  }
};

const updateCustomer = async (req, res) => {
  const { getPool } = require('../models/db');
  try {
    // Accept Customer_ID either from URL param (legacy) or request body
    // (path-based IDs break for values containing "/", e.g. "CD2026/1379",
    // because IIS / many reverse proxies reject "%2F" in URLs).
    const id = req.params.id || req.body.Customer_ID;
    const {
      Customer_Code,
      Name,
      Reference_Code,
      Customer_Type,
      PhoneNumber,
      PhoneNumber2,
      Address1,
      Address2,
      StreetAddress1,
      StreetAddress2,
      Area,
      District_ID,
      State_ID,
      Pincode,
      Delivery_Point_ID
    } = req.body;

    const finalAddress1 = Address1 || StreetAddress1;
    const finalAddress2 = Address2 || StreetAddress2;

    const pool = await getPool();
    const request = pool.request();
    request.input('id', sql.VarChar(50), id);
    request.input('Customer_Code', sql.VarChar(100), Customer_Code || '');
    request.input('Name', sql.VarChar(255), Name);
    request.input('Reference_Code', sql.VarChar(100), Reference_Code || '');
    request.input('Customer_Type', sql.VarChar(100), Customer_Type || '');
    request.input('Phone_Number', sql.VarChar(20), PhoneNumber ? String(PhoneNumber) : null);
    request.input('Phone_Number2', sql.VarChar(20), PhoneNumber2 ? String(PhoneNumber2) : null);
    request.input('Address1', sql.VarChar(500), finalAddress1 || '');
    request.input('Address2', sql.VarChar(500), finalAddress2 || '');
    request.input('Area', sql.VarChar(255), Area || '');
    request.input('District_ID', sql.Int, District_ID || null);
    request.input('State_ID', sql.Int, State_ID || null);
    request.input('Pincode', sql.Int, Pincode || null);
    request.input('Delivery_Point_ID', sql.Int, Delivery_Point_ID || null);

    await request.query(`
      UPDATE Customer_Master SET 
        Customer_Code = @Customer_Code,
        Name = @Name, Reference_Code = @Reference_Code, Customer_Type = @Customer_Type, 
        Phone_Number = @Phone_Number, Phone_Number2 = @Phone_Number2, 
        Address1 = @Address1, Address2 = @Address2,
        Area = @Area, District_ID = @District_ID, State_ID = @State_ID,
        Pincode = @Pincode, Delivery_Point_ID = @Delivery_Point_ID
      WHERE Customer_ID = @id
    `);

    return sendSuccess(res, 'Customer updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update customer', error);
  }
};

const deleteCustomer = async (req, res) => {
  const { getPool } = require('../models/db');
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { id } = req.params;
    await transaction.begin();

    const request = new sql.Request(transaction);

    // 0. Delete Auction Participation/Wins
    // Found via sys.foreign_keys: Auctions references Customer_Master
    const req0 = new sql.Request(transaction);
    await req0.input('customerId', sql.VarChar(50), id)
              .query('DELETE FROM Auctions WHERE Customer_ID = @customerId');

    // 1. Delete Payments
    await request.input('customerId', sql.VarChar(50), id)
                 .query('DELETE FROM Payment_Master WHERE Customer_ID = @customerId');

    // 1.1 Delete Order Tracking records
    // Added to resolve FK conflict: FK__Order_Tra__Custo__60A75C0F
    const reqOrders = new sql.Request(transaction);
    await reqOrders.input('customerId', sql.VarChar(50), id)
                   .query('DELETE FROM Order_Tracking WHERE Customer_ID = @customerId');

    // 2. Delete Scheme Dues
    const req2 = new sql.Request(transaction);
    await req2.input('customerId', sql.VarChar(50), id)
              .query('DELETE FROM Scheme_Due WHERE Customer_ID = @customerId');

    // 3. Delete Scheme Memberships
    const req3 = new sql.Request(transaction);
    await req3.input('customerId', sql.VarChar(50), id)
              .query('DELETE FROM Scheme_Members WHERE Customer_ID = @customerId');

    // 4. Delete Customer
    const req4 = new sql.Request(transaction);
    await req4.input('customerId', sql.VarChar(50), id)
              .query('DELETE FROM Customer_Master WHERE Customer_ID = @customerId');

    await transaction.commit();
    return sendSuccess(res, 'Customer and all related data deleted successfully');
  } catch (error) {
    if (transaction.active) await transaction.rollback().catch(() => {});
    return sendError(res, 'Failed to delete customer', error);
  }
};

const checkCustomerId = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
        return sendError(res, 'Customer ID is required', null, 400);
    }
    const customer = await executeQuery(
      'SELECT Customer_ID FROM Customer_Master WHERE Customer_ID = @param0',
      [{ value: id, type: sql.VarChar(50) }]
    );
    return sendSuccess(res, 'Check complete', { exists: customer.length > 0 });
  } catch (error) {
    return sendError(res, 'Failed to check customer ID', error);
  }
};

const downloadCustomers = async (req, res) => {
    try {
        const { search = '', fund_number } = req.query;
        const Customer_Type = req.query.Customer_Type || req.query.customer_type;

        let baseSelect = `
            SELECT c.Customer_ID, c.Customer_Code, c.Name, c.Reference_Code, c.Delivery_Point_ID, c.Customer_Type, 
                   c.Phone_Number, c.Phone_Number2, c.Address1, c.Area, c.Pincode,
                   ISNULL(d.District_Name, 'N/A') as District_Name, 
                   ISNULL(s.State_Name, 'N/A') as State_Name
        `;
        
        let fromQuery = `
            FROM Customer_Master c 
            LEFT JOIN District_Master d ON c.District_ID = d.District_ID 
            LEFT JOIN State_Master s ON c.State_ID = s.State_ID
        `;

        if (fund_number) {
            fromQuery += ` INNER JOIN Scheme_Members sm ON c.Customer_ID = sm.Customer_ID`;
        }

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 0;

        if (search) {
            whereClause += ` AND (c.Name LIKE @param${paramIndex} OR CAST(c.Phone_Number AS VARCHAR(20)) LIKE @param${paramIndex})`;
            params.push({ value: `%${search}%`, type: sql.VarChar });
            paramIndex++;
        }
        if (Customer_Type) {
            whereClause += ` AND c.Customer_Type LIKE @param${paramIndex}`;
            params.push({ value: `%${Customer_Type}%`, type: sql.VarChar });
            paramIndex++;
        }
        if (fund_number) {
            whereClause += ` AND sm.Fund_Number LIKE @param${paramIndex}`;
            params.push({ value: `%${fund_number}%`, type: sql.VarChar });
            paramIndex++;
        }

        const query = `${baseSelect} ${fromQuery} ${whereClause} ORDER BY c.Customer_ID DESC`;

        const customers = await executeQuery(query, params);
        const csvData = convertToCsv(customers);

        // Standard CSV response handling works, or we can wrap it?
        // Usually file downloads are handled differently. Let's keep it as is or standardized if the client expects JSON wrapper.
        // Frontend uses blob, so standard content-type is better.
        res.header('Content-Type', 'text/csv');
        res.attachment(`customers_${Date.now()}.csv`);
        res.send(csvData);
    } catch (error) {
        // Can't really send JSON if headers already sent, but let's try safely.
        if (!res.headersSent) return sendError(res, 'Download failed', error);
    }
};

const uploadCustomers = async (req, res) => {
  if (!req.file) {
    return sendError(res, 'No file uploaded', null, 400);
  }

  try {
    // Parse Excel using the same named-column format as the sample download
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = xlsx.utils.sheet_to_json(ws);

    if (rawRows.length === 0) {
      return sendError(res, 'Excel file is empty', null, 400);
    }
    const MAX_ROWS = 10000;
    if (rawRows.length > MAX_ROWS) {
      return sendError(res, `Upload limit exceeded. Maximum ${MAX_ROWS} rows per upload.`, null, 400);
    }

    // Neutralise CSV/Excel formula injection in any string we echo back into the
    // failed-rows workbook. Cells beginning with =, +, -, @, tab, or CR can be
    // interpreted as formulas by spreadsheet apps (CWE-1236).
    const sanitizeCell = (v) => {
      if (typeof v !== 'string') return v;
      return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    };
    const sanitizeRow = (row) => {
      const out = {};
      for (const k in row) out[k] = sanitizeCell(row[k]);
      return out;
    };

    // Parse a phone-like cell into digits only; returns null if no digits found
    // so we never insert the literal string "NaN".
    const parsePhone = (v) => {
      if (v === null || v === undefined || v === '') return null;
      const digits = String(v).replace(/\D/g, '');
      return digits.length > 0 ? digits : null;
    };

    // Normalise column names with the same flexible mapping used by the sample file.
    // Keep the original row alongside the normalised record so we can return failures verbatim.
    const processed = [];
    const failedRows = [];
    for (const row of rawRows) {
      const record = {};
      for (const key in row) {
        const k = key.trim().toLowerCase().replace(/[_\s]/g, '');
        if (k.includes('customercode') || k === 'code')          record.Customer_Code = String(row[key]);
        else if (k.includes('name'))                              record.Name = String(row[key]);
        else if (k.includes('phonenumber') || k.includes('phone') || k.includes('mobile')) record.Phone_Number = parsePhone(row[key]);
        else if (k.includes('secondaryphone') || k === 'phone2') record.Phone_Number2 = parsePhone(row[key]);
        else if (k.includes('type'))                              record.Customer_Type = String(row[key]);
        else if (k.includes('address1') || k.includes('addressline1')) record.Address1 = String(row[key]);
        else if (k.includes('address2') || k.includes('addressline2')) record.Address2 = String(row[key]);
        else if (k === 'state')                                   record.State = String(row[key]);
        else if (k === 'district')                                record.District = String(row[key]);
        else if (k.includes('pincode') || k.includes('pin'))     record.Pincode = row[key] ? parseInt(row[key], 10) : null;
        else if (k.includes('referencecode') || k.includes('refcode')) record.Reference_Code = String(row[key]);
      }
      if (record.Name && record.Phone_Number) {
        processed.push({ record, original: row });
      } else {
        failedRows.push({ ...sanitizeRow(row), Reason: 'Missing required field (Name or valid Phone Number)' });
      }
    }

    // Pre-fetch state/district lookup tables once — not inside the per-row loop
    const [states, districts] = await Promise.all([
      executeQuery('SELECT State_ID, State_Name FROM State_Master', []),
      executeQuery('SELECT District_ID, District_Name FROM District_Master', []),
    ]);

    let successCount = 0;

    // Independent per-row inserts: a bad row is skipped without affecting others.
    for (const { record, original } of processed) {
      try {
        const customerId = await generateCustomerId();

        const stateRow = record.State
          ? states.find(x => x.State_Name.toLowerCase() === record.State.toLowerCase().trim())
          : null;
        const districtRow = record.District
          ? districts.find(x => x.District_Name.toLowerCase() === record.District.toLowerCase().trim())
          : null;

        await executeQuery(
          `INSERT INTO Customer_Master
            (Customer_ID, Customer_Code, Name, Reference_Code, Customer_Type,
             Phone_Number, Phone_Number2, Address1, Address2,
             District_ID, State_ID, Pincode, Created_At)
           VALUES
            (@param0, @param1, @param2, @param3, @param4,
             @param5, @param6, @param7, @param8,
             @param9, @param10, @param11, GETDATE())`,
          [
            { value: customerId,                              type: sql.VarChar(50) },
            { value: record.Customer_Code || '',              type: sql.VarChar(100) },
            { value: record.Name,                             type: sql.VarChar(255) },
            { value: record.Reference_Code || '',             type: sql.VarChar(100) },
            { value: record.Customer_Type || 'New',           type: sql.VarChar(100) },
            { value: record.Phone_Number,                     type: sql.VarChar(20) },
            { value: record.Phone_Number2 || null,            type: sql.VarChar(20) },
            { value: record.Address1 || '',                   type: sql.VarChar(500) },
            { value: record.Address2 || '',                   type: sql.VarChar(500) },
            { value: districtRow ? districtRow.District_ID : null, type: sql.Int },
            { value: stateRow    ? stateRow.State_ID       : null, type: sql.Int },
            { value: record.Pincode || null,                  type: sql.Int },
          ]
        );

        successCount++;
      } catch (rowErr) {
        // Log the full driver error server-side; return a generic reason to the client
        // so DB schema/constraint names are not leaked to the browser or the downloaded file.
        console.error('[BulkUpload] Row failed:', rowErr.message);
        const reason =
          rowErr.number === 2627 || rowErr.number === 2601
            ? 'Duplicate value'
            : 'Insert failed (invalid data)';
        failedRows.push({ ...sanitizeRow(original), Reason: reason });
      }
    }

    return sendSuccess(
      res,
      `Upload complete. Success: ${successCount}, Failed: ${failedRows.length}`,
      { successCount, failCount: failedRows.length, failedRows }
    );
  } catch (error) {
    return sendError(res, 'Failed to parse uploaded file', error);
  }
};

const getCustomerByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const result = await executeQuery(`
            SELECT * FROM Customer_Master WHERE Customer_Code = @param0 OR Customer_ID = @param0
        `, [{ value: code, type: sql.VarChar(50) }]);

        if (result.length === 0) {
            return sendError(res, 'Customer Code not found', null, 404);
        }

        return sendSuccess(res, 'Customer fetched successfully', result[0]);
    } catch (error) {
        return sendError(res, 'Failed to fetch customer by code', error);
    }
};

const getCustomerByFundNumber = async (req, res) => {
    try {
        const { fundNumber } = req.params;
        const result = await executeQuery(`
            SELECT 
                c.Customer_ID, 
                c.Name, 
                c.Phone_Number,
                sm.Scheme_ID, 
                sm.Fund_Number, 
                cm.Name as Scheme_Name
            FROM Scheme_Members sm
            JOIN Customer_Master c ON sm.Customer_ID = c.Customer_ID
            JOIN Chit_Master cm ON sm.Scheme_ID = cm.Scheme_ID
            WHERE sm.Fund_Number = @param0
                 OR sm.Fund_Number LIKE @param1
        `, [
            { value: fundNumber, type: sql.VarChar(50) },
            { value: `%/${fundNumber}`, type: sql.VarChar(50) }
        ]);

        if (result.length === 0) {
            return sendError(res, 'Fund Number not found', null, 404);
        }

        return sendSuccess(res, 'Customer fetched by fund number successfully', result[0]);
    } catch (error) {
        return sendError(res, 'Failed to fetch customer by fund number', error);
    }
};

const getReferenceCodes = async (req, res) => {
    try {
        const result = await executeQuery(`
            SELECT DISTINCT Reference_Code 
            FROM Customer_Master 
            WHERE Reference_Code IS NOT NULL AND Reference_Code != ''
            ORDER BY Reference_Code ASC
        `);
        const codes = result.map(r => r.Reference_Code);
        return sendSuccess(res, 'Reference codes fetched successfully', codes);
    } catch (error) {
        return sendError(res, 'Failed to fetch reference codes', error);
    }
};

const getCustomerSchemes = async (req, res) => {
  try {
    const { id } = req.params;
    // Simple JOIN to get Scheme details and Fund Number directly
    const schemes = await executeQuery(
      `SELECT sm.Scheme_ID, sm.Fund_Number, cm.Name as Scheme_Name 
       FROM Scheme_Members sm
       JOIN Chit_Master cm ON sm.Scheme_ID = cm.Scheme_ID
       WHERE sm.Customer_ID = @param0`,
      [{ value: id, type: sql.VarChar(50) }]
    );
    return sendSuccess(res, 'Customer schemes fetched successfully', schemes);
  } catch (error) {
    return sendError(res, 'Failed to fetch customer schemes', error);
  }
};

const removeScheme = async (req, res) => {
  const { getPool } = require('../models/db');
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    const { id, schemeId } = req.params;
    await transaction.begin();

    const reqDue = new sql.Request(transaction);
    await reqDue
      .input('customerId', sql.VarChar(50), id)
      .input('schemeId', sql.Int, parseInt(schemeId))
      .query('DELETE FROM Scheme_Due WHERE Customer_ID = @customerId AND Scheme_ID = @schemeId');

    const reqMember = new sql.Request(transaction);
    const memberResult = await reqMember
      .input('customerId', sql.VarChar(50), id)
      .input('schemeId', sql.Int, parseInt(schemeId))
      .query('DELETE FROM Scheme_Members WHERE Customer_ID = @customerId AND Scheme_ID = @schemeId');

    if (memberResult.rowsAffected[0] === 0) {
      console.warn(`[RemoveScheme] No member record found for Cust: ${id}, Scheme: ${schemeId}`);
    }

    await transaction.commit();
    return sendSuccess(res, 'Scheme removed successfully');
  } catch (error) {
    if (transaction.active) await transaction.rollback().catch(() => {});
    return sendError(res, 'Failed to remove scheme', error);
  }
};

const assignSchemes = async (req, res) => {
  const { getPool } = require('../models/db');
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { id } = req.params;
    const { schemeIds, fundNumber, sendWhatsapp } = req.body;

    await transaction.begin();
    const request = new sql.Request(transaction);

    // Fetch Customer Details for WA
    const customerReq = new sql.Request(transaction);
    const customerRes = await customerReq.input('cid', sql.VarChar(50), id)
        .query('SELECT Phone_Number, Name FROM Customer_Master WHERE Customer_ID = @cid');
    const customer = customerRes.recordset[0];


    // 1. Get Existing Assignments to avoid duplicates
    // We do NOT delete existing anymore to prevent data loss or history loss
    const existingReq = new sql.Request(transaction);
    const existingRes = await existingReq.input('customerId', sql.VarChar(50), id)
                                         .query('SELECT Scheme_ID FROM Scheme_Members WHERE Customer_ID = @customerId');
    
    // Create a Set of existing scheme IDs for fast lookup
    const existingSchemeIds = new Set(existingRes.recordset.map(r => r.Scheme_ID));

    // 2. Validate Single Scheme Rule
    // Data Integrity: A customer can only be in ONE scheme at a time.
    if (existingSchemeIds.size > 0) {
      // If customer already has a scheme
      const existingSchemeId = existingSchemeIds.values().next().value;
      
      // Check if we are trying to assign a DIFFERENT scheme
      // (We allow re-assigning the SAME scheme for idempotency)
      const isDifferentScheme = (schemeIds || []).some(sid => sid !== existingSchemeId);
      
      if (isDifferentScheme) {
        await transaction.rollback();
        return sendError(res, 'Customer is already assigned to a scheme. Please remove the existing scheme before assigning a new one.', null, 400);
      }
    }

    // Check if trying to assign multiple schemes at once
    if ((schemeIds || []).length > 1) {
        await transaction.rollback();
        return sendError(res, 'A customer can only be assigned to one scheme at a time.', null, 400);
    }

    // 3. Filter out schemes that are already assigned
    // If schemeIds is null/undefined, we act like it's empty
    const uniqueSchemesToAssign = (schemeIds || []).filter(sid => !existingSchemeIds.has(sid));
    
    if (uniqueSchemesToAssign.length === 0) {
         await transaction.rollback(); // No changes made, helpful to rollback empty transaction
         return sendSuccess(res, 'Scheme already assigned to this customer.');
    }

    // 3. Prepare Bulk Insert Data for NEW schemes only
    let assignedSchemesList = [];
    let allDues = [];
    
    // 3a. Prepare Scheme Members Data
    for (const schemeId of uniqueSchemesToAssign) {
      const fundNum = fundNumber || await generateFundNumber(transaction);
      assignedSchemesList.push(fundNum);
      
      // Insert Member - Keeping individual insert for members as volume is low (usually 1)
      console.log(`Inserting member for scheme ${schemeId}...`);
      const insertMemberReq = new sql.Request(transaction);
      await insertMemberReq.input('customerId', sql.VarChar(50), id)
                            .input('schemeId', sql.Int, schemeId)
                            .input('fundNum', sql.VarChar(50), fundNum)
                            .query('INSERT INTO Scheme_Members (Customer_ID, Scheme_ID, Fund_Number, Status, Join_date, Created_at, Updated_at) VALUES (@customerId, @schemeId, @fundNum, \'Active\', GETDATE(), GETDATE(), GETDATE())');

      // 3b. Calculate Dues for Bulk Insert
      const schemeDetailsReq = new sql.Request(transaction);
      const schemeResult = await schemeDetailsReq.input('schemeId', sql.Int, schemeId)
          .query('SELECT Name, Amount_per_month, Number_of_due, Month_from FROM Chit_Master WHERE Scheme_ID = @schemeId');
      
      const scheme = schemeResult.recordset[0];
      if (scheme) {
          for (let i = 1; i <= scheme.Number_of_due; i++) {
              const dueDate = new Date(scheme.Month_from);
              dueDate.setMonth(dueDate.getMonth() + (i - 1));
              dueDate.setDate(10); // Set due date to 10th of the month
              
              allDues.push({
                  schemeId,
                  customerId: id,
                  fundNum,
                  dueNumber: i,
                  dueDate,
                  dueAmount: scheme.Amount_per_month
              });
          }
      }
    }

    // 4. Bulk Insert Dues using sql.Table (Much Faster)
      if (allDues.length > 0) {
        console.log(`Bulk inserting ${allDues.length} dues...`);
        const table = new sql.Table('Scheme_Due');
        table.create = false;
        
        // Match DB Column Order EXACTLY:
        // 1. Scheme_ID
        // 2. Due_number
        // 3. Due_date
        // 4. Due_amount
        // 5. Recd_amount
        // 6. amt_received_date
        // 7. Customer_ID
        // 8. Fund_Number

        table.columns.add('Scheme_ID', sql.Int, { nullable: false });
        table.columns.add('Due_number', sql.Int, { nullable: false });
        table.columns.add('Due_date', sql.Date, { nullable: true });
        table.columns.add('Due_amount', sql.Decimal(15, 2), { nullable: true });
        table.columns.add('Recd_amount', sql.Decimal(15, 2), { nullable: true });
        table.columns.add('amt_received_date', sql.Date, { nullable: true });
        table.columns.add('Customer_ID', sql.VarChar(50), { nullable: false });
        table.columns.add('Fund_Number', sql.VarChar(50), { nullable: true });

        allDues.forEach(due => {
          table.rows.add(
            due.schemeId,       // Scheme_ID
            due.dueNumber,      // Due_number
            due.dueDate,        // Due_date
            due.dueAmount,      // Due_amount
            null,               // Recd_amount
            null,               // amt_received_date
            due.customerId,     // Customer_ID
            due.fundNum         // Fund_Number
          );
        });

        const bulkReq = new sql.Request(transaction);
        await bulkReq.bulk(table);
      }

    await transaction.commit();
    return sendSuccess(res, `Assigned ${uniqueSchemesToAssign.length} new schemes successfully.`);

  } catch (error) {
    if (transaction.active) await transaction.rollback().catch(() => {});
    console.error('Assign schemes error:', error);
    return sendError(res, 'Failed to assign schemes', error);
  }
};

const getNextCustomerId = async (req, res) => {
    try {
        const id = await generateCustomerId();
        return sendSuccess(res, 'Next Customer ID generated', { id });
    } catch (error) {
        return sendError(res, 'Failed to generate customer ID', error);
    }
};

const getNextFundNumber = async (req, res) => {
    try {
        const fundNum = await generateFundNumber();
        return sendSuccess(res, 'Next Fund Number generated', { fundNumber: fundNum });
    } catch (error) {
        return sendError(res, 'Failed to generate fund number', error);
    }
};

const getNextIds = async (req, res) => {
  try {
    const [customerId, fundNumber] = await Promise.all([
      generateCustomerId(),
      generateFundNumber(),
    ]);
    return sendSuccess(res, 'Next IDs fetched successfully', { customerId, fundNumber });
  } catch (error) {
    return sendError(res, 'Failed to fetch next IDs', error);
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  checkCustomerId,
  downloadCustomers,
  uploadCustomers,
  exportCustomers: downloadCustomers, // Alias for routes
  bulkCreateCustomers: uploadCustomers, // Alias for routes
  getCustomerByCode,
  getCustomerByFundNumber,
  getCustomerSchemes,
  assignSchemes,
  removeScheme,
  getNextCustomerId,
  getNextFundNumber,
  getNextIds,
  getReferenceCodes
};
