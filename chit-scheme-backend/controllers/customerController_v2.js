const { executeQuery, executeInsertGetId, executeUpdate } = require('../models/db');
const sql = require('mssql');
const { convertToCsv, parseExcel } = require('../utils');
const xlsx = require('xlsx');
const path = require('path');
const { sendWhatsappMessage } = require('../services/whatsappService');

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

    res.json({
      customers,
      pagination: {
        totalRecords: totalResult[0]?.total || 0,
        totalPages: limit ? Math.ceil((totalResult[0]?.total || 0) / parseInt(limit)) : 1,
        currentPage: parseInt(page),
        pageSize: limit ? parseInt(limit) : (totalResult[0]?.total || 0)
      }
    });
  } catch (error) {
    console.error('❌ getAllCustomers Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customers' });
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
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    res.status(201).json({
      success: true,
      customerId: Customer_ID,
      message: "Customer created successfully",
    });
  } catch (error) {
    if (transaction.active) await transaction.rollback();
    res.status(500).json({ error: error.message });
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

    res.json({ success: true, message: "Customer updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.json({ success: true, message: 'Customer and all related data deleted successfully' });
  } catch (error) {
    if (transaction.active) await transaction.rollback();
    console.error('❌ deleteCustomer Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const checkCustomerId = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }
    const customer = await executeQuery(
      'SELECT Customer_ID FROM Customer_Master WHERE Customer_ID = @param0',
      [{ value: id, type: sql.VarChar(50) }]
    );
    res.json({ exists: customer.length > 0 });
  } catch (error) {
    console.error('❌ checkCustomerId Error:', error);
    res.status(500).json({ error: error.message });
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

        res.header('Content-Type', 'text/csv');
        res.attachment(`customers_${Date.now()}.csv`);
        res.send(csvData);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: error.message });
    }
};

const uploadCustomers = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
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
        res.json({ success: true, message: `${successCount} omers uploaded successfully.` });
    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ error: 'Bulk upload failed.', details: error.message });
    }
};

const getCustomerByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const result = await executeQuery(`
            SELECT * FROM Customer_Master WHERE Customer_Code = @param0 OR Customer_ID = @param0
        `, [{ value: code, type: sql.VarChar(50) }]);

        if (result.length === 0) {
            return res.status(404).json({ error: 'Customer Code not found' });
        }

        res.json(result[0]);
    } catch (error) {
        console.error('❌ getCustomerByCode Error:', error);
        res.status(500).json({ error: error.message });
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
            return res.status(404).json({ error: 'Fund Number not found' });
        }

        res.json(result[0]);
    } catch (error) {
        console.error('❌ getCustomerByFundNumber Error:', error);
        res.status(500).json({ error: error.message });
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
    res.json(schemes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const assignSchemes = async (req, res) => {
  const connection = await sql.connect(require('../config/database').dbConfig);
  const transaction = new sql.Transaction(connection);
  
  try {
    const { id } = req.params;
    const { schemeIds, fundNumber, sendWhatsapp } = req.body; // Array of Scheme_IDs, Optional single fundNumber, sendWhatsapp flag

    await transaction.begin();
    const request = new sql.Request(transaction);

    // Fetch Phone Number for WA
    const customerReq = new sql.Request(transaction);
    const customerRes = await customerReq.input('cid', sql.VarChar(50), id)
        .query('SELECT Phone_Number, Name FROM Customer_Master WHERE Customer_ID = @cid');
    const customer = customerRes.recordset[0];


    // 1. Delete existing assignments
    await request.input('customerId', sql.VarChar(50), id)
                 .query('DELETE FROM Scheme_Members WHERE Customer_ID = @customerId');

    // 2. Delete existing dues
    const deleteDuesReq = new sql.Request(transaction);
    await deleteDuesReq.input('customerId', sql.VarChar(50), id)
                       .query('DELETE FROM Scheme_Due WHERE Customer_ID = @customerId');

    // 3. Insert new assignments and generate dues
    let assignedSchemesList = [];
    if (schemeIds && schemeIds.length > 0) {
      for (const schemeId of schemeIds) {
        const fundNum = fundNumber || await generateFundNumber(); // Use provided or generate

        // Insert Member
        const insertMemberReq = new sql.Request(transaction);
        await insertMemberReq.input('customerId', sql.VarChar(50), id)
                             .input('schemeId', sql.Int, schemeId)
                             .input('fundNum', sql.VarChar(50), fundNum)
                             .query('INSERT INTO Scheme_Members (Customer_ID, Scheme_ID, Fund_Number) VALUES (@customerId, @schemeId, @fundNum)');
        
        assignedSchemesList.push(fundNum);

        // Fetch Scheme Details for Dues
        const schemeDetailsReq = new sql.Request(transaction);
        const schemeResult = await schemeDetailsReq.input('schemeId', sql.Int, schemeId)
            .query('SELECT Name, Amount_per_month, Number_of_due, Month_from FROM Chit_Master WHERE Scheme_ID = @schemeId');
        
        const scheme = schemeResult.recordset[0];
        if (scheme) {
            for (let i = 1; i <= scheme.Number_of_due; i++) {
                const dueDate = new Date(scheme.Month_from);
                dueDate.setMonth(dueDate.getMonth() + (i - 1));
                dueDate.setDate(10); // Set due date to 10th of the month

                const insertDueReq = new sql.Request(transaction);
                await insertDueReq.input('schemeId', sql.Int, schemeId)
                                  .input('customerId', sql.VarChar(50), id)
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

    // 📱 Send WhatsApp Notification (Scheme Assigned)
    if (customer && customer.Phone_Number && assignedSchemesList.length > 0 && sendWhatsapp !== false) {
         // Sending one global assignment msg or per scheme? Usually one is better or just the first.
         sendWhatsappMessage(String(customer.Phone_Number), "welcomecccc", [id, "Scheme Assigned: " + assignedSchemesList.join(', ')], customer.Name)
            .catch(err => console.error("WA Send Failed (Assign Scheme):", err.message));
    }

    res.json({ success: true, message: 'Schemes assigned and dues generated successfully' });
  } catch (error) {
    if (transaction.active) await transaction.rollback();
    console.error('❌ assignSchemes Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await connection.close();
  }
};

// Export Customers to CSV
const exportCustomers = async (req, res) => {
  try {
    const { search = '', state, district, scheme_id } = req.query;
    
    let query = `
      SELECT c.Customer_ID, c.Customer_Code, c.Name, c.Reference_Name, c.Customer_Type, 
             c.Phone_Number, c.Area, c.Pincode, c.Address1, c.Address2,
             ISNULL(d.District_Name, 'N/A') as District_Name, 
             ISNULL(s.State_Name, 'N/A') as State_Name
      FROM Customer_Master c 
      LEFT JOIN District_Master d ON c.District_ID = d.District_ID 
      LEFT JOIN State_Master s ON c.State_ID = s.State_ID
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 0;
    
    if (search) {
      query += ` AND (
        c.Name LIKE @param${paramIndex} 
        OR CAST(c.Phone_Number AS VARCHAR(20)) LIKE @param${paramIndex}
        OR c.Customer_Code LIKE @param${paramIndex}
        OR c.Customer_ID LIKE @param${paramIndex}
      )`;
      params.push({ value: `%${search}%`, type: sql.VarChar });
      paramIndex++;
    }
    
    if (state) {
      query += ` AND c.State_ID = @param${paramIndex}`;
      params.push({ value: state, type: sql.Int });
      paramIndex++;
    }
    
    if (district) {
      query += ` AND c.District_ID = @param${paramIndex}`;
      params.push({ value: district, type: sql.Int });
      paramIndex++;
    }
    
    query += ` ORDER BY c.Name`;
    
    const customers = await executeQuery(query, params);
    
    // Convert to CSV
    const csv = convertToCsv(customers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send(csv);
  } catch (error) {
    console.error('exportCustomers error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Bulk create Customers from Excel upload
const bulkCreateCustomers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'No data found in file' });
    }
    
    const connection = await sql.connect(require('../config/database').dbConfig);
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Auto-generate Customer_ID if not provided
        let customerId = row['Customer ID'] || row['Customer_ID'];
        if (!customerId) {
          customerId = await generateCustomerId();
        }
        
        const phoneNumber = row['Phone Number'] || row['Phone_Number'];
        const name = row['Name'] || '';
        const customerCode = row['Customer Code'] || row['Customer_Code'] || '';
        const referenceName = row['Reference Name'] || row['Reference_Name'] || '';
        const customerType = row['Customer Type'] || row['Customer_Type'] || '';
        
        if (!phoneNumber) {
          results.errors.push(`Row ${i + 2}: Phone Number is required`);
          results.failed++;
          continue;
        }
        
        // Insert Customer
        await executeQuery(`
          INSERT INTO Customer_Master (
            Customer_ID, Customer_Code, Name, Reference_Name, Customer_Type, 
            Phone_Number, Phone_Number2, Address1, Address2, 
            Area, District_ID, State_ID, Pincode
          )
          VALUES (
            @param0, @param1, @param2, @param3, @param4, 
            @param5, NULL, '', '', 
            '', NULL, NULL, NULL
          )
        `, [
          { value: customerId, type: sql.VarChar(50) },
          { value: customerCode, type: sql.VarChar(50) },
          { value: name, type: sql.VarChar(100) },
          { value: referenceName, type: sql.VarChar(100) },
          { value: customerType, type: sql.VarChar(50) },
          { value: phoneNumber, type: sql.VarChar(20) }
        ]);
        
        results.success++;
      } catch (error) {
        results.errors.push(`Row ${i + 2}: ${error.message}`);
        results.failed++;
      }
    }
    
    res.json({
      message: 'Bulk upload completed',
      total: data.length,
      success: results.success,
      failed: results.failed,
      errors: results.errors
    });
  } catch (error) {
    console.error('bulkCreateCustomers error:', error);
    res.status(500).json({ error: error.message });
  }
};

// API endpoint to get next fund number
const getNextFundNumber = async (req, res) => {
  try {
    const fundNumber = await generateFundNumber();
    res.json({ fundNumber });
  } catch (error) {
    console.error('getNextFundNumber error:', error);
    res.status(500).json({ error: error.message });
  }
};

// API endpoint to get next Customer ID
const getNextCustomerId = async (req, res) => {
  try {
    const customerId = await generateCustomerId();
    res.json({ customerId });
  } catch (error) {
    console.error('getNextCustomerId error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  checkCustomerId,
  assignSchemes,
  getCustomerSchemes,
  exportCustomers,
  bulkCreateCustomers,
  getNextFundNumber,
  getNextCustomerId,
  generateCustomerId,
  getCustomerByFundNumber,
};
