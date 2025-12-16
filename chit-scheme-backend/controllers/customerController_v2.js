const { executeQuery, executeInsertGetId, executeUpdate } = require('../models/db');
const sql = require('mssql');
const { convertToCsv, parseExcel } = require('../utils');
const xlsx = require('xlsx');
const path = require('path');

const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', state, district, area, scheme_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build base query
    let baseQuery = `
      SELECT c.Customer_ID, c.Name, c.Reference_Name, c.Customer_Type, 
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

    // Search functionality - Updated for Name
    if (search) {
      whereClause += ` AND (c.Name LIKE @param${paramIndex} OR CAST(c.Phone_Number AS VARCHAR(20)) LIKE @param${paramIndex})`;
      params.push({ value: `%${search}%`, type: sql.VarChar });
      paramIndex++;
    }

    // State, District, Area, Scheme filters (paramIndex increments logic remains same as original if used, 
    // but easier to keep simple logic here)
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
    if (req.query.customer_type) {
        // Handle filter for multiple types if sent as array, or single partial match
        // Assuming simple string match for now as stored in CSV
        whereClause += ` AND c.Customer_Type LIKE @param${paramIndex}`;
        params.push({ value: `%${req.query.customer_type}%`, type: sql.VarChar });
        paramIndex++;
    }

    if (req.query.has_scheme === 'true') {
        whereClause += ` AND EXISTS (SELECT 1 FROM Scheme_Members sm WHERE sm.Customer_ID = c.Customer_ID)`;
    }

    const customersQuery = `
      ${baseQuery},
      ISNULL((SELECT COUNT(*) FROM Scheme_Members WHERE Customer_ID = c.Customer_ID), 0) as total_schemes,
      ISNULL((SELECT COUNT(*) FROM Payment_Master WHERE Customer_ID = c.Customer_ID), 0) as total_payments
      ${fromQuery}
      ${whereClause}
      ORDER BY c.Customer_ID DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;

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
        totalPages: Math.ceil((totalResult[0]?.total || 0) / limit),
        currentPage: parseInt(page),
        pageSize: parseInt(limit)
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
    const {
      Customer_ID,
      Name,
      Reference_Name,
      Customer_Type,
      PhoneNumber,
      PhoneNumber2,
      Address1,
      Address2,
      // Support legacy/frontend variations
      StreetAddress1, 
      StreetAddress2,
      Area,
      District_ID,
      State_ID,
      Pincode,
      Scheme_ID,
      Fund_Number // Optional: Use if provided, else generate
    } = req.body;

    const finalAddress1 = Address1 || StreetAddress1;
    const finalAddress2 = Address2 || StreetAddress2;

    await transaction.begin();
    
    // 1. Insert Customer
    const insertReq = new sql.Request(transaction);
    await insertReq.query(`
      INSERT INTO Customer_Master (
        Customer_ID, Name, Reference_Name, Customer_Type, 
        Phone_Number, Phone_Number2, Address1, Address2, 
        Area, District_ID, State_ID, Pincode
      )
      VALUES (
        '${Customer_ID}', '${Name}', '${Reference_Name || ''}', '${Customer_Type}', 
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
            const fundNum = schemeItem.fundNumber || generateFundNumber();

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
    res.status(201).json({
      success: true,
      customerId: Customer_ID,
      message: "Customer created successfully",
    });
  } catch (error) {
    if (transaction.active) await transaction.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    // await connection.close(); // Keep specific connection handling if needed, usually pool handles it
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
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
        { value: Pincode, type: sql.Int }
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
    // Re-create request for next query (or reuse if input params are identical, but safer to re-state or strictly reuse properly)
    // Tedious/MSSQL often prefers fresh requests per query in a transaction or careful param mgmt.
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
  } finally {
    // await connection.close(); // Optional based on pool config
  }
};

// ✅ FIXED: Handle VARCHAR Customer_ID
const checkCustomerId = async (req, res) => {
  try {
    const { id } = req.params;
    // ✅ NO parseInt() - Customer_ID is VARCHAR(50)
    const customer = await executeQuery(
      'SELECT Customer_ID FROM Customer_Master WHERE Customer_ID = @param0',
      [{ value: id, type: sql.VarChar(50) }]  // ✅ VarChar, not Int
    );
    res.json({ exists: customer.length > 0 });
  } catch (error) {
    console.error('❌ checkCustomerId Error:', error);
    res.status(500).json({ error: error.message });
  }
};


const downloadCustomers = async (req, res) => {
    try {
        const { search = '', customer_type, fund_number } = req.query;

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
        if (customer_type) {
            whereClause += ` AND c.Customer_Type LIKE @param${paramIndex}`;
            params.push({ value: `%${customer_type}%`, type: sql.VarChar });
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
        res.json({ success: true, message: `${successCount} customers uploaded successfully.` });
    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ error: 'Bulk upload failed.', details: error.message });
    }
};

// Search Customer by Fund Number
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

// Helper to generate Fund Number
const generateFundNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000); // 4 digit random
    return `${year}_${month}_${random}`;
};

const assignSchemes = async (req, res) => {
  const connection = await sql.connect(require('../config/database').dbConfig);
  const transaction = new sql.Transaction(connection);
  
  try {
    const { id } = req.params;
    const { schemeIds, fundNumber } = req.body; // Array of Scheme_IDs, Optional single fundNumber

    await transaction.begin();
    const request = new sql.Request(transaction);

    // 1. Delete existing assignments
    await request.input('customerId', sql.VarChar(50), id)
                 .query('DELETE FROM Scheme_Members WHERE Customer_ID = @customerId');

    // 2. Delete existing dues
    const deleteDuesReq = new sql.Request(transaction);
    await deleteDuesReq.input('customerId', sql.VarChar(50), id)
                       .query('DELETE FROM Scheme_Due WHERE Customer_ID = @customerId');

    // 3. Insert new assignments and generate dues
    if (schemeIds && schemeIds.length > 0) {
      for (const schemeId of schemeIds) {
        const fundNum = fundNumber || generateFundNumber(); // Use provided or generate

        // Insert Member
        const insertMemberReq = new sql.Request(transaction);
        await insertMemberReq.input('customerId', sql.VarChar(50), id)
                             .input('schemeId', sql.Int, schemeId)
                             .input('fundNum', sql.VarChar(50), fundNum)
                             .query('INSERT INTO Scheme_Members (Customer_ID, Scheme_ID, Fund_Number) VALUES (@customerId, @schemeId, @fundNum)');

        // Fetch Scheme Details for Dues
        const schemeDetailsReq = new sql.Request(transaction);
        const schemeResult = await schemeDetailsReq.input('schemeId', sql.Int, schemeId)
            .query('SELECT Amount_per_month, Number_of_due, Month_from FROM Chit_Master WHERE Scheme_ID = @schemeId');
        
        const scheme = schemeResult.recordset[0];
        if (scheme) {
            for (let i = 1; i <= scheme.Number_of_due; i++) {
                const dueDate = new Date(scheme.Month_from);
                dueDate.setMonth(dueDate.getMonth() + (i - 1));

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
    res.json({ success: true, message: 'Schemes assigned and dues generated successfully' });
  } catch (error) {
    if (transaction.active) await transaction.rollback();
    console.error('❌ assignSchemes Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await connection.close();
  }
};

module.exports = { 
  getAllCustomers, getCustomerById, 
  createCustomer, updateCustomer, deleteCustomer,
  checkCustomerId, downloadCustomers, uploadCustomers,
  getCustomerSchemes, assignSchemes, getCustomerByFundNumber
};
