const { executeQuery, executeInsertGetId, executeUpdate } = require('../models/db');
const sql = require('mssql');
const { convertToCsv, parseExcel } = require('../utils');
const xlsx = require('xlsx');
const path = require('path');
const { sendWhatsappMessage } = require('../services/whatsappService');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// Helper to generate Customer ID in format: custid/2026/001
const generateCustomerId = async () => {
  const year = new Date().getFullYear();
  const prefix = `custid/${year}/`;
  
  // Query for latest customer ID with this year's prefix
  const result = await executeQuery(`
    SELECT TOP 1 Customer_ID 
    FROM Customer_Master 
    WHERE Customer_ID LIKE @param0
    ORDER BY Customer_ID DESC
  `, [{ value: `${prefix}%`, type: sql.VarChar }]);
  
  let nextNumber = 1;
  if (result.length > 0) {
    const lastId = result[0].Customer_ID;
    const match = lastId.match(/\/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }
  
  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
};

// Helper to generate Fund Number in format: fund/2026/001
const generateFundNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `fund/${year}/`;
  
  // Query for latest fund number with this year's prefix
  const result = await executeQuery(`
    SELECT TOP 1 Fund_Number 
    FROM Scheme_Members
    WHERE Fund_Number LIKE @param0
    ORDER BY Fund_Number DESC
  `, [{ value: `${prefix}%`, type: sql.VarChar }]);
  
  let nextNumber = 1;
  if (result.length > 0) {
    const lastFund = result[0].Fund_Number;
    const match = lastFund.match(/\/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }
  
  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
};

const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit, search = '', state, district, area, scheme_id } = req.query;

    // Build base query
    let baseQuery = `
      SELECT c.Customer_ID, c.Customer_Code, c.Name, c.Reference_Name, c.Customer_Type, 
             c.Phone_Number, c.Area, c.State_ID, c.District_ID, c.Pincode,
             c.Address1, c.Address2,
             ISNULL(d.District_Name, 'N/A') as District_Name, 
             ISNULL(s.State_Name, 'N/A') as State_Name
    `;
    
    let fromQuery = `
      FROM Customer_Master c 
      LEFT JOIN District_Master d ON c.District_ID = d.District_ID 
      LEFT JOIN State_Master s ON c.State_ID = s.State_ID
    `;
    
    if (scheme_id || req.query.fund_number) {
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
    if (req.query.fund_number) {
      whereClause += ` AND sm.Fund_Number LIKE @param${paramIndex}`;
      params.push({ value: `%${req.query.fund_number}%`, type: sql.VarChar });
      paramIndex++;
    }
    if (req.query.Customer_Type) {
        // Handle filter for multiple types if sent as array, or single partial match
        // Assuming simple string match for now as stored in CSV
        whereClause += ` AND c.Customer_Type LIKE @param${paramIndex}`;
        params.push({ value: `%${req.query.Customer_Type}%`, type: sql.VarChar });
        paramIndex++;
    }

    if (req.query.has_scheme === 'true') {
        whereClause += ` AND EXISTS (SELECT 1 FROM Scheme_Members sm WHERE sm.Customer_ID = c.Customer_ID)`;
    }

    let customersQuery = `
      ${baseQuery},
      ISNULL((SELECT COUNT(*) FROM Scheme_Members WHERE Customer_ID = c.Customer_ID), 0) as total_schemes,
      (SELECT STRING_AGG(cm.Name, ', ') FROM Scheme_Members sm JOIN Chit_Master cm ON sm.Scheme_ID = cm.Scheme_ID WHERE sm.Customer_ID = c.Customer_ID) as Assigned_Schemes,
      ISNULL((SELECT COUNT(*) FROM Payment_Master WHERE Customer_ID = c.Customer_ID), 0) as total_payments
      ${fromQuery}
      ${whereClause}
      ORDER BY c.Customer_ID DESC
    `;

    // Only add pagination if limit is provided
    if (limit) {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      customersQuery += ` OFFSET ${offset} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
    }

    const customers = await executeQuery(customersQuery, params);

    const totalQuery = `
      SELECT COUNT(DISTINCT c.Customer_ID) as total 
      ${fromQuery}
      ${whereClause}
    `;
    const totalResult = await executeQuery(totalQuery, params);

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
  const connection = await sql.connect(require('../config/database').dbConfig);
  const transaction = new sql.Transaction(connection);

  try {
    let {
      Customer_ID,
      Customer_Code, // Extract new Field
      Name,
      Reference_Name,
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
      sendWhatsapp // Extract flag
    } = req.body;

    // Auto-generate Customer_ID if not provided
    if (!Customer_ID) {
      Customer_ID = await generateCustomerId();
    }

    const finalAddress1 = Address1 || StreetAddress1;
    const finalAddress2 = Address2 || StreetAddress2;

    await transaction.begin();
    
    // 1. Insert Customer
    const insertReq = new sql.Request(transaction);
    await insertReq.query(`
      INSERT INTO Customer_Master (
        Customer_ID, Customer_Code, Name, Reference_Name, Customer_Type, 
        Phone_Number, Phone_Number2, Address1, Address2, 
        Area, District_ID, State_ID, Pincode
      )
      VALUES (
        '${Customer_ID}', '${Customer_Code || ''}', '${Name}', '${Reference_Name || ''}', '${Customer_Type || ''}', 
        ${PhoneNumber}, ${PhoneNumber2 || 'NULL'}, '${finalAddress1 || ''}', '${finalAddress2 || ''}', 
        '${Area || ''}', ${District_ID || 'NULL'}, ${State_ID || 'NULL'}, ${Pincode || 'NULL'}
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
        for (const schemeItem of schemesToAssign) {
            const schemeId = schemeItem.schemeId;
            const fundNum = schemeItem.fundNumber || await generateFundNumber();

            // Insert Member
            const assignReq = new sql.Request(transaction);
            await assignReq.input('customerId', sql.VarChar(50), Customer_ID)
                           .input('schemeId', sql.Int, schemeId)
                           .input('fundNum', sql.VarChar(50), fundNum)
                           .query(`
                               INSERT INTO Scheme_Members (Customer_ID, Scheme_ID, Fund_Number, Status, Join_date, Created_at, Updated_at) 
                               VALUES (@customerId, @schemeId, @fundNum, 'Active', GETDATE(), GETDATE(), GETDATE())
                           `);

            // Generate Dues Logic
            const schemeDetailsReq = new sql.Request(transaction);
            const schemeResult = await schemeDetailsReq.input('schemeId', sql.Int, schemeId)
                  .query('SELECT Amount_per_month, Number_of_due, Month_from FROM Chit_Master WHERE Scheme_ID = @schemeId');
              
            const scheme = schemeResult.recordset[0];
            if (scheme) {
                for (let i = 1; i <= scheme.Number_of_due; i++) {
                    const dueDate = new Date(scheme.Month_from);
                    dueDate.setMonth(dueDate.getMonth() + (i - 1));
                    dueDate.setDate(10); // Set due date to 10th of the month

                    const insertDueReq = new sql.Request(transaction);
                    await insertDueReq.input('schemeId', sql.Int, schemeId)
                                      .input('customerId', sql.VarChar(50), Customer_ID)
                                      .input('fundNum', sql.VarChar(50), fundNum)
                                      .input('dueNumber', sql.Int, i)
                                      .input('dueDate', sql.Date, dueDate)
                                      .input('dueAmount', sql.Decimal(15, 2), scheme.Amount_per_month)
                                      .query(`
                                          INSERT INTO Scheme_Due (Scheme_ID, Customer_ID, Fund_Number, Due_number, Due_date, Due_amount)
                                          VALUES (@schemeId, @customerId, @fundNum, @dueNumber, @dueDate, @dueAmount)
                                      `);
                }
            }
        }
    }

    await transaction.commit();

    // 📱 Send WhatsApp Notification (User Created) - Async, don't block response
    // Template Params: ["Customer Name"]
    if (PhoneNumber && sendWhatsapp !== false) {
        sendWhatsappMessage(String(PhoneNumber), "welcomecccc", [String(Customer_ID), Name], Name)
            .catch(err => console.error("WA Send Failed (Create Customer):", err.message));
    }

    return sendSuccess(res, 'Customer created successfully', { customerId: Customer_ID }, 201);
  } catch (error) {
    if (transaction.active) await transaction.rollback();
    return sendError(res, 'Failed to create customer', error);
  } finally {
    // connection cleanup handled by pool usually
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      Customer_Code, // Update Code
      Name,
      Reference_Name,
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
      Pincode
    } = req.body;

    const finalAddress1 = Address1 || StreetAddress1;
    const finalAddress2 = Address2 || StreetAddress2;

    await executeUpdate(
      `
      UPDATE Customer_Master SET 
        Customer_Code = @param12,
        Name = @param1, Reference_Name = @param2, Customer_Type = @param3, 
        Phone_Number = @param4, Phone_Number2 = @param5, 
        Address1 = @param6, Address2 = @param7,
        Area = @param8, District_ID = @param9, State_ID = @param10,
        Pincode = @param11
      WHERE Customer_ID = @param0
    `,
      [
        { value: id, type: sql.VarChar(50) },
        { value: Name, type: sql.VarChar },
        { value: Reference_Name, type: sql.VarChar },
        { value: Customer_Type, type: sql.VarChar },
        { value: PhoneNumber, type: sql.BigInt },
        { value: PhoneNumber2, type: sql.BigInt },
        { value: finalAddress1, type: sql.VarChar },
        { value: finalAddress2, type: sql.VarChar },
        { value: Area, type: sql.VarChar },
        { value: District_ID || null, type: sql.Int },
        { value: State_ID || null, type: sql.Int },
        { value: Pincode, type: sql.Int },
        { value: Customer_Code, type: sql.VarChar }
      ]
    );

    return sendSuccess(res, 'Customer updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update customer', error);
  }
};

const deleteCustomer = async (req, res) => {
  const connection = await sql.connect(require('../config/database').dbConfig);
  const transaction = new sql.Transaction(connection);

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
    if (transaction.active) await transaction.rollback();
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
        const { search = '', Customer_Type, fund_number } = req.query;

        let baseSelect = `
            SELECT c.Customer_ID, c.Name, c.Reference_Name, c.Customer_Type, 
                   c.Phone_Number, c.Address1, c.Area, c.Pincode,
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

    // Determine file type (CSV or Excel) and parse accordingly
    const ext = path.extname(req.file.originalname).toLowerCase();
    let rows = [];
    if (ext === '.xlsx' || ext === '.xls') {
        // Use Excel parser utility
        rows = parseExcel(req.file.buffer);
    } else {
        // Assume CSV
        const csvData = req.file.buffer.toString('utf-8');
        rows = csvData.split('\n').slice(1);
    }

    const transaction = new sql.Transaction();
    try {
        await transaction.begin();
        let successCount = 0;

        for (const row of rows) {
            if (!row) continue;
            // Support both CSV (comma‑separated) and Excel (array) formats
            const values = Array.isArray(row) ? row : row.split(',');
            const [Customer_ID, FirstName, LastName, PhoneNumber, PhoneNumber2, StreetAddress1, StreetAddress2, Area, District_ID, State_ID, Pincode, Nationality] = values;
            const name = `${FirstName} ${LastName}`;

            const request = new sql.Request(transaction);
            await request.query(`
                INSERT INTO Customer_Master (Customer_ID, First_Name, Last_Name, Phone_Number, Phone_Number2, Address1, Address2, Area, District_ID, State_ID, Pincode, Nationality)
                VALUES (${Customer_ID}, '${FirstName}', '${LastName}', ${PhoneNumber}, ${PhoneNumber2}, '${StreetAddress1}', '${StreetAddress2}', '${Area}', ${District_ID}, ${State_ID}, ${Pincode}, '${Nationality}')
            `);
            successCount++;
        }

        await transaction.commit();
        return sendSuccess(res, `${successCount} customers uploaded successfully.`);
    } catch (error) {
        await transaction.rollback();
        return sendError(res, 'Bulk upload failed', error);
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
        `, [{ value: fundNumber, type: sql.VarChar(50) }]);

        if (result.length === 0) {
            return sendError(res, 'Fund Number not found', null, 404);
        }

        return sendSuccess(res, 'Customer fetched by fund number successfully', result[0]);
    } catch (error) {
        return sendError(res, 'Failed to fetch customer by fund number', error);
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
  try {
    const { id, schemeId } = req.params;
    
    const connection = await sql.connect(require('../config/database').dbConfig);
    const transaction = new sql.Transaction(connection);
    
    try {
        await transaction.begin();

        // 1. Delete associated Dues
        const reqDue = new sql.Request(transaction);
        const dueResult = await reqDue.input('customerId', sql.VarChar(50), id)
                    .input('schemeId', sql.Int, parseInt(schemeId))
                    .query('DELETE FROM Scheme_Due WHERE Customer_ID = @customerId AND Scheme_ID = @schemeId');
        console.log(`[RemoveScheme] Deleted ${dueResult.rowsAffected[0]} dues for Cust: ${id}, Scheme: ${schemeId}`);

        // 2. Delete Scheme Member record
        const reqMember = new sql.Request(transaction);
        const memberResult = await reqMember.input('customerId', sql.VarChar(50), id)
                       .input('schemeId', sql.Int, parseInt(schemeId))
                       .query('DELETE FROM Scheme_Members WHERE Customer_ID = @customerId AND Scheme_ID = @schemeId');
        console.log(`[RemoveScheme] Deleted ${memberResult.rowsAffected[0]} members for Cust: ${id}, Scheme: ${schemeId}`);

        if (memberResult.rowsAffected[0] === 0) {
            console.warn(`[RemoveScheme] Limit warning: No member record found to delete for Cust: ${id}, Scheme: ${schemeId}`);
        }

        await transaction.commit();
        return sendSuccess(res, 'Scheme removed successfully');
    } catch (err) {
        if (transaction.active) await transaction.rollback();
        throw err;
    }
  } catch (error) {
    return sendError(res, 'Failed to remove scheme', error);
  }
};

const assignSchemes = async (req, res) => {
  const connection = await sql.connect(require('../config/database').dbConfig);
  const transaction = new sql.Transaction(connection);
  
  try {
    const { id } = req.params;
    const { schemeIds, fundNumber, sendWhatsapp } = req.body; // Array of Scheme_IDs, Optional single fundNumber, sendWhatsapp flag

    // INCREASE TIMEOUT TO 10 MINUTES (600000ms)
    await transaction.begin(null, { timeout: 600000 });
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
      const fundNum = fundNumber || await generateFundNumber(); // Use provided or generate
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
    console.log('Transaction committed.');
    
    // Send success response
    return sendSuccess(res, `Assigned ${uniqueSchemesToAssign.length} new schemes successfully.`);
    
  } catch (error) {
    if (transaction.active) await transaction.rollback();
    console.error('Assign schemes error:', error);
    return sendError(res, 'Failed to assign schemes', error);
  } finally {
    // Check if connection is healthy before closing? Pool handles it.
    // await connection.close(); // Don't close pool connection manually if using globbal pool, but here we did sql.connect
    await connection.close(); 
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

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  checkCustomerId,

  exportCustomers: downloadCustomers,
  bulkCreateCustomers: uploadCustomers,
  getCustomerByCode,
  getCustomerByFundNumber,
  getCustomerSchemes,
  assignSchemes,
  generateCustomerId,
  generateFundNumber,
  getNextCustomerId,
  getNextFundNumber,
  removeScheme
};
