const { executeQuery, executeInsertGetId, executeUpdate } = require('../models/db');
const sql = require('mssql');
const { convertToCsv, parseExcel } = require('../utils');
const xlsx = require('xlsx');
const path = require('path');
const { sendWhatsappMessage } = require('../services/whatsappService');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// Helper to generate Customer ID in format: CD2026/001
const generateCustomerId = async () => {
  const year = new Date().getFullYear();
  const prefix = `CD${year}/`;
  
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

// Helper to generate Fund Number in format: F2026/001
const generateFundNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `F${year}/`;
  
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
    const { page = 1, limit, search = '', state, district, area, scheme_id, customer_type, Customer_Type, fund_number } = req.query;

    // Build base query
    let baseQuery = `
      SELECT c.Customer_ID, c.Customer_Code, c.Name, c.Reference_Code, c.Delivery_Point_ID, c.Customer_Type, 
             c.Phone_Number, c.Phone_Number2, c.Area, c.State_ID, c.District_ID, c.Pincode,
             c.Address1, c.Address2,
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
      whereClause += ` AND sm.Fund_Number LIKE @param${paramIndex}`;
      params.push({ value: `%${fund_number}%`, type: sql.VarChar });
      paramIndex++;
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

    let customersQuery = `
      ${baseQuery},
       ISNULL(sm_counts.total_schemes, 0) as total_schemes,
       ISNULL(sm_agg.Assigned_Schemes, '') as Assigned_Schemes,
       ISNULL(pm_counts.total_payments, 0) as total_payments
      ${fromQuery}
      OUTER APPLY (
          SELECT COUNT(*) as total_schemes 
          FROM Scheme_Members sm 
          WHERE sm.Customer_ID = c.Customer_ID
      ) sm_counts
      OUTER APPLY (
          SELECT STRING_AGG(cm.Name, ', ') as Assigned_Schemes 
          FROM Scheme_Members sm 
          JOIN Chit_Master cm ON sm.Scheme_ID = cm.Scheme_ID 
          WHERE sm.Customer_ID = c.Customer_ID
      ) sm_agg
      OUTER APPLY (
          SELECT COUNT(*) as total_payments 
          FROM Payment_Master pm 
          WHERE pm.Customer_ID = c.Customer_ID
      ) pm_counts
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

    // Auto-generate Customer_ID if not provided
    if (!Customer_ID) {
      Customer_ID = await generateCustomerId();
    }

    const finalAddress1 = Address1 || StreetAddress1;
    const finalAddress2 = Address2 || StreetAddress2;

    await transaction.begin();
    
    // 1. Insert Customer using parameterized inputs
    const insertReq = new sql.Request(transaction);
    insertReq.input('Customer_ID', sql.VarChar(50), Customer_ID);
    insertReq.input('Customer_Code', sql.VarChar(100), Customer_Code || '');
    insertReq.input('Name', sql.VarChar(255), Name);
    insertReq.input('Reference_Code', sql.VarChar(100), Reference_Code || '');
    insertReq.input('Customer_Type', sql.VarChar(100), Customer_Type || '');
    insertReq.input('Phone_Number', sql.BigInt, PhoneNumber);
    insertReq.input('Phone_Number2', sql.BigInt, PhoneNumber2 || null);
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
        Area, District_ID, State_ID, Pincode, Delivery_Point_ID
      )
      VALUES (
        @Customer_ID, @Customer_Code, @Name, @Reference_Code, @Customer_Type, 
        @Phone_Number, @Phone_Number2, @Address1, @Address2, 
        @Area, @District_ID, @State_ID, @Pincode,  @Delivery_Point_ID
      )
    `);

    // ... rest of the logic remains the same (already parameterized)
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

            // Insert Member and capture the auto-generated Membership_ID (IDENTITY)
            const assignReq = new sql.Request(transaction);
            const memberInsertResult = await assignReq
                           .input('customerId', sql.VarChar(50), Customer_ID)
                           .input('schemeId', sql.Int, schemeId)
                           .input('fundNum', sql.VarChar(50), fundNum)
                           .query(`
                               INSERT INTO Scheme_Members (Customer_ID, Scheme_ID, Fund_Number, Status, Join_date, Created_at, Updated_at)
                               OUTPUT INSERTED.Membership_ID
                               VALUES (@customerId, @schemeId, @fundNum, 'Active', GETDATE(), GETDATE(), GETDATE())
                           `);
            const membershipId = memberInsertResult.recordset[0].Membership_ID;

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
                    await insertDueReq.input('membershipId', sql.Int, membershipId)
                                      .input('customerId', sql.VarChar(50), Customer_ID)
                                      .input('dueNumber', sql.Int, i)
                                      .input('dueDate', sql.Date, dueDate)
                                      .input('dueAmount', sql.Decimal(15, 2), scheme.Amount_per_month)
                                      .query(`
                                          INSERT INTO Scheme_Due (Membership_ID, Customer_ID, Due_number, Due_date, Due_amount)
                                          VALUES (@membershipId, @customerId, @dueNumber, @dueDate, @dueAmount)
                                      `);
                }
            }
        }
    }

    await transaction.commit();

    // 📱 Send WhatsApp Notification (User Created) - Async, don't block response
    if (PhoneNumber && sendWhatsapp !== false) {
        sendWhatsappMessage(String(PhoneNumber), "welcomecccc", [String(Customer_ID), Name], Name)
            .catch(err => console.error("WA Send Failed (Create Customer):", err.message));
    }

    return sendSuccess(res, 'Customer created successfully', { customerId: Customer_ID }, 201);
  } catch (error) {
    if (transaction.active) await transaction.rollback();
    return sendError(res, 'Failed to create customer', error);
  } finally {
    await connection.close();
  }
};

const updateCustomer = async (req, res) => {
  const connection = await sql.connect(require('../config/database').dbConfig);
  try {
    const { id } = req.params;
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

    const request = new sql.Request(connection);
    request.input('id', sql.VarChar(50), id);
    request.input('Customer_Code', sql.VarChar(100), Customer_Code || '');
    request.input('Name', sql.VarChar(255), Name);
    request.input('Reference_Code', sql.VarChar(100), Reference_Code || '');
    request.input('Customer_Type', sql.VarChar(100), Customer_Type || '');
    request.input('Phone_Number', sql.BigInt, PhoneNumber);
    request.input('Phone_Number2', sql.BigInt, PhoneNumber2 || null);
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
  } finally {
    await connection.close();
  }
};

const deleteCustomer = async (req, res) => {
  const connection = await sql.connect(require('../config/database').dbConfig);
  const transaction = new sql.Transaction(connection);

  try {
    const { id } = req.params;
    await transaction.begin();

    const request = new sql.Request(transaction);

    // 0. Delete Auction Participation/Wins (Auctions has no Customer_ID — route via Scheme_Members)
    const req0 = new sql.Request(transaction);
    await req0.input('customerId', sql.VarChar(50), id)
              .query(`
                DELETE FROM Auctions 
                WHERE Membership_ID IN (
                  SELECT Membership_ID FROM Scheme_Members WHERE Customer_ID = @customerId
                )
              `);

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

    // Determine file type (CSV or Excel) and parse accordingly
    const ext = path.extname(req.file.originalname).toLowerCase();
    let rows = [];
    if (ext === '.xlsx' || ext === '.xls') {
        // Use Excel parser utility
        rows = await parseExcel(req.file.buffer);
    } else {
        // Assume CSV
        const csvData = req.file.buffer.toString('utf-8');
        rows = csvData.split('\n').slice(1);
    }

    const connection = await sql.connect(require('../config/database').dbConfig);
    const transaction = new sql.Transaction(connection);
    
    try {
        await transaction.begin();

        const table = new sql.Table('Customer_Master');
        table.create = false;
        
        // Define columns strictly matching DB schema
        table.columns.add('Customer_ID', sql.VarChar(50), { nullable: false });
        table.columns.add('Customer_Code', sql.VarChar(50), { nullable: true }); // Make sure this exists in DB
        table.columns.add('Name', sql.VarChar(100), { nullable: true }); // Split into First/Last or receive full name? 
        // CSV headers: Customer_ID, First_Name, Last_Name...
        // DB columns: Name (merged), or does it have First/Last? 
        // The previous code did: Name = `${FirstName} ${LastName}`
        
        table.columns.add('Customer_Type', sql.VarChar(50), { nullable: true });
        table.columns.add('Phone_Number', sql.BigInt, { nullable: true });
        table.columns.add('Phone_Number2', sql.BigInt, { nullable: true });
        table.columns.add('Address1', sql.VarChar(sql.MAX), { nullable: true });
        table.columns.add('Address2', sql.VarChar(sql.MAX), { nullable: true });
        table.columns.add('Area', sql.VarChar(100), { nullable: true });
        table.columns.add('District_ID', sql.Int, { nullable: true });
        table.columns.add('State_ID', sql.Int, { nullable: true });
        table.columns.add('Pincode', sql.Int, { nullable: true });
        table.columns.add('Nationality', sql.VarChar(50), { nullable: true });


        let successCount = 0;

        for (const row of rows) {
            if (!row) continue;
            // Support both CSV (comma-separated string) and Excel (object/array) formats?
            // csvData.split('\n') gives strings. parseExcel gives objects? 
            // Previous code handled: values = Array.isArray(row) ? row : row.split(',');
            // Wait, parseExcel in schemeController returns array of objects. 
            // But here raw csv split gives strings.
            
            let values;
            if (typeof row === 'string') {
                 values = row.split(',');
            } else if (Array.isArray(row)) {
                 values = row;
            } else {
                // If Object (from optimized excel parser?), map to values
                // For now assuming the previous logic regarding array/string holds
                values = Object.values(row);
            }
            
            if (values.length < 4) continue; // Basic skip empty rows

            // CAREFULLY MAP COLUMNS based on previous INSERT:
            // Customer_ID, First_Name, Last_Name, Phone_Number, Phone_Number2, Address1, Address2, Area, District_ID, State_ID, Pincode, Nationality
            
            const Customer_ID = values[0];
            const FirstName = values[1];
            const LastName = values[2];
            const PhoneNumber = values[3] ? parseInt(values[3]) : null;
            const PhoneNumber2 = values[4] ? parseInt(values[4]) : null;
            const StreetAddress1 = values[5];
            const StreetAddress2 = values[6];
            const Area = values[7];
            const District_ID = values[8] ? parseInt(values[8]) : null;
            const State_ID = values[9] ? parseInt(values[9]) : null;
            const Pincode = values[10] ? parseInt(values[10]) : null;
            const Nationality = values[11];
            
            const Name = `${FirstName || ''} ${LastName || ''}`.trim();
            
            // Add Row to Table
            // Customer_ID, Customer_Code, Name, Reference_Code, Customer_Type, Phone_Number, Phone_Number2, Address1, Address2, Area, District_ID, State_ID, Pincode, Nationality
            table.rows.add(
                Customer_ID,
                null, // Customer_Code (not in CSV?)
                Name,
                null, // Reference_Code
                null, // Customer_Type
                PhoneNumber,
                PhoneNumber2,
                StreetAddress1,
                StreetAddress2,
                Area,
                District_ID,
                State_ID,
                Pincode,
                Nationality
            );
            
            successCount++;
        }

        const request = new sql.Request(transaction);
        await request.bulk(table);

        await transaction.commit();
        return sendSuccess(res, `${successCount} customers uploaded successfully.`);
    } catch (error) {
        if (transaction.active) await transaction.rollback();
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
                sm.Membership_ID,
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
    // Simple JOIN to get Scheme details, Fund Number, and Membership_ID
    const schemes = await executeQuery(
      `SELECT sm.Membership_ID, sm.Scheme_ID, sm.Fund_Number, sm.Status, sm.Join_date, cm.Name as Scheme_Name 
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

        // 0. Lookup Membership_ID for this customer+scheme combination
        const memberLookupReq = new sql.Request(transaction);
        const memberLookup = await memberLookupReq
            .input('customerId', sql.VarChar(50), id)
            .input('schemeId', sql.Int, parseInt(schemeId))
            .query('SELECT Membership_ID FROM Scheme_Members WHERE Customer_ID = @customerId AND Scheme_ID = @schemeId');

        if (memberLookup.recordset.length === 0) {
            await transaction.rollback();
            return sendError(res, 'No matching scheme membership found for this customer', null, 404);
        }
        const membershipId = memberLookup.recordset[0].Membership_ID;

        // 1. Delete associated Payments (by Membership_ID)
        const reqPay = new sql.Request(transaction);
        const payResult = await reqPay
            .input('membershipId', sql.Int, membershipId)
            .query('DELETE FROM Payment_Master WHERE Membership_ID = @membershipId');
        console.log(`[RemoveScheme] Deleted ${payResult.rowsAffected[0]} payments for Membership_ID: ${membershipId}`);

        // 2. Delete associated Dues (by Membership_ID)
        const reqDue = new sql.Request(transaction);
        const dueResult = await reqDue
            .input('membershipId', sql.Int, membershipId)
            .query('DELETE FROM Scheme_Due WHERE Membership_ID = @membershipId');
        console.log(`[RemoveScheme] Deleted ${dueResult.rowsAffected[0]} dues for Membership_ID: ${membershipId}`);

        // 3. Delete associated Auctions (by Membership_ID)
        const reqAuction = new sql.Request(transaction);
        const auctionResult = await reqAuction
            .input('membershipId', sql.Int, membershipId)
            .query('DELETE FROM Auctions WHERE Membership_ID = @membershipId');
        console.log(`[RemoveScheme] Deleted ${auctionResult.rowsAffected[0]} auctions for Membership_ID: ${membershipId}`);

        // 4. Delete Scheme Member record
        const reqMember = new sql.Request(transaction);
        const memberResult = await reqMember
            .input('membershipId', sql.Int, membershipId)
            .query('DELETE FROM Scheme_Members WHERE Membership_ID = @membershipId');
        console.log(`[RemoveScheme] Deleted ${memberResult.rowsAffected[0]} membership record, Membership_ID: ${membershipId}`);

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
      
      // Insert Member and capture the auto-generated Membership_ID (IDENTITY)
      console.log(`Inserting member for scheme ${schemeId}...`);
      const insertMemberReq = new sql.Request(transaction);
      const memberInsertResult = await insertMemberReq
                            .input('customerId', sql.VarChar(50), id)
                            .input('schemeId', sql.Int, schemeId)
                            .input('fundNum', sql.VarChar(50), fundNum)
                            .query(`
                                INSERT INTO Scheme_Members (Customer_ID, Scheme_ID, Fund_Number, Status, Join_date, Created_at, Updated_at)
                                OUTPUT INSERTED.Membership_ID
                                VALUES (@customerId, @schemeId, @fundNum, 'Active', GETDATE(), GETDATE(), GETDATE())
                            `);
      const newMembershipId = memberInsertResult.recordset[0].Membership_ID;
      console.log(`Membership_ID ${newMembershipId} created for scheme ${schemeId}.`);

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
                  membershipId: newMembershipId,
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

    // 4. Insert Dues individually using parameterized queries (avoids BCP column ordering issues)
      if (allDues.length > 0) {
        console.log(`Inserting ${allDues.length} dues individually...`);
        for (const due of allDues) {
          const insertDueReq = new sql.Request(transaction);
          await insertDueReq
            .input('membershipId', sql.Int, due.membershipId)
            .input('customerId', sql.VarChar(50), due.customerId)
            .input('dueNumber', sql.Int, due.dueNumber)
            .input('dueDate', sql.Date, due.dueDate)
            .input('dueAmount', sql.Decimal(15, 2), due.dueAmount)
            .query(`
              INSERT INTO Scheme_Due (Membership_ID, Customer_ID, Due_number, Due_date, Due_amount)
              VALUES (@membershipId, @customerId, @dueNumber, @dueDate, @dueAmount)
            `);
        }
        console.log(`All ${allDues.length} dues inserted successfully.`);
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

const getNextIds = async (req, res) => {
  try {
    const customerId = await generateCustomerId();
    const fundNumber = await generateFundNumber();
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
};
