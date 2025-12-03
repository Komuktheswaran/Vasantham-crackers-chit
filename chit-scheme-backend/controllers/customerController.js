const { executeQuery, executeInsertGetId, executeUpdate } = require('../models/db');
const sql = require('mssql');
const { convertToCsv, parseExcel } = require('../utils');
const xlsx = require('xlsx');
const path = require('path');

const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', state, district, area, scheme_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build base query with proper parameterization
    let baseQuery = `
      SELECT c.*, 
             ISNULL(d.District_Name, 'N/A') as District_Name, 
             ISNULL(s.State_Name, 'N/A') as State_Name
    `;
    
    let fromQuery = `
      FROM Customer_Master c 
      LEFT JOIN District_Master d ON c.District_ID = d.District_ID 
      LEFT JOIN State_Master s ON c.State_ID = s.State_ID
    `;
    
    // Add scheme join if filtering by scheme
    if (scheme_id) {
      fromQuery += ` INNER JOIN Scheme_Members sm ON c.Customer_ID = sm.Customer_ID`;
    }

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 0;

    // Search functionality
    if (search) {
      whereClause += ` AND (c.Name LIKE @param${paramIndex} OR CAST(c.Phone_Number AS VARCHAR(20)) LIKE @param${paramIndex})`;
      params.push({ value: `%${search}%`, type: sql.VarChar });
      paramIndex++;
    }

    // State filter
    if (state) {
      whereClause += ` AND s.State_Name = @param${paramIndex}`;
      params.push({ value: state, type: sql.VarChar(100) });
      paramIndex++;
    }

    // District filter
    if (district) {
      whereClause += ` AND d.District_Name = @param${paramIndex}`;
      params.push({ value: district, type: sql.VarChar(100) });
      paramIndex++;
    }

    // Area filter
    if (area) {
      whereClause += ` AND c.Area LIKE @param${paramIndex}`;
      params.push({ value: `%${area}%`, type: sql.VarChar(100) });
      paramIndex++;
    }

    // Scheme filter
    if (scheme_id) {
      whereClause += ` AND sm.Scheme_ID = @param${paramIndex}`;
      params.push({ value: parseInt(scheme_id), type: sql.Int });
      paramIndex++;
    }

    // Main query with pagination
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

    // Total count query
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
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch customers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    
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
  try {
    const {
      Customer_ID,
      FirstName,
      LastName,
      PhoneNumber,
      PhoneNumber2,
      StreetAddress1,
      StreetAddress2,
      Area,
      District_ID,
      State_ID,
      Pincode,
      Nationality,
    } = req.body;
    console.log(req.body);

    const name = `${FirstName} ${LastName}`;

    const result = await executeInsertGetId(
      `
      INSERT INTO Customer_Master (Customer_ID, First_Name, Last_Name, Phone_Number, Phone_Number2, Address1, Address2, Area, District_ID, State_ID, Pincode, Nationality)
      OUTPUT INSERTED.Customer_ID
      VALUES (@param0, @param1, @param2, @param3, @param4, @param5, 
              @param6, @param7, @param8, @param9, @param10, @param11)`,
      [
        { value: Customer_ID, type: sql.VarChar },
        { value: FirstName, type: sql.VarChar },
        { value: LastName, type: sql.VarChar },
        { value: PhoneNumber, type: sql.BigInt },
        { value: PhoneNumber2, type: sql.BigInt },
        { value: StreetAddress1, type: sql.VarChar },
        { value: StreetAddress2, type: sql.VarChar },
        { value: Area, type: sql.VarChar },
        { value: District_ID || null, type: sql.Int },
        { value: State_ID || null, type: sql.Int },
        { value: Pincode, type: sql.Int },
        { value: Nationality, type: sql.VarChar },
      ]
    );

    res.status(201).json({
      success: true,
      customerId: result.Customer_ID,
      message: "Customer created successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      FirstName,
      LastName,
      PhoneNumber,
      PhoneNumber2,
      StreetAddress1,
      StreetAddress2,
      Area,
      District_ID,
      State_ID,
      Pincode,
      Nationality,
    } = req.body;

    const name = `${FirstName} ${LastName}`;

    await executeUpdate(
      `
      UPDATE Customer_Master SET 
        Name = @param1, First_Name = @param2, Last_Name = @param3, 
        Phone_Number = @param4, Phone_Number2 = @param5, 
        Street_Address1 = @param6, Street_Address2 = @param7,
        Area = @param8, District_ID = @param9, State_ID = @param10,
        Pincode = @param11, Nationality = @param12
      WHERE Customer_ID = @param0
    `,
      [
        { value: parseInt(id), type: sql.Int },
        { value: name, type: sql.VarChar },
        { value: FirstName, type: sql.VarChar },
        { value: LastName, type: sql.VarChar },
        { value: PhoneNumber, type: sql.BigInt },
        { value: PhoneNumber2, type: sql.BigInt },
        { value: StreetAddress1, type: sql.VarChar },
        { value: StreetAddress2, type: sql.VarChar },
        { value: Area, type: sql.VarChar },
        { value: District_ID || null, type: sql.Int },
        { value: State_ID || null, type: sql.Int },
        { value: Pincode, type: sql.Int },
        { value: Nationality, type: sql.VarChar },
      ]
    );

    res.json({ success: true, message: "Customer updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await executeUpdate('DELETE FROM Customer_Master WHERE Customer_ID = @param0', 
      [{ value: parseInt(id), type: sql.Int }]);
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
        const { search = '' } = req.query;

        let query = `
            SELECT c.*, 
                   ISNULL(d.District_Name, 'N/A') as District_Name, 
                   ISNULL(s.State_Name, 'N/A') as State_Name
            FROM Customer_Master c 
            LEFT JOIN District_Master d ON c.District_ID = d.District_ID 
            LEFT JOIN State_Master s ON c.State_ID = s.State_ID
        `;
        const params = [];

        if (search) {
            query += ' WHERE c.Name LIKE @param0 OR CAST(c.Phone_Number AS VARCHAR(20)) LIKE @param0';
            params.push({ value: `%${search}%`, type: sql.VarChar });
        }

        query += ' ORDER BY c.Customer_ID DESC';

        const customers = await executeQuery(query, params);
        const csvData = convertToCsv(customers);

        res.header('Content-Type', 'text/csv');
        res.attachment('customers.csv');
        res.send(csvData);
    } catch (error) {
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
                INSERT INTO Customer_Master (Customer_ID, Name, First_Name, Last_Name, Phone_Number, Phone_Number2, Street_Address1, Street_Address2, Area, District_ID, State_ID, Pincode, Nationality)
                VALUES (${Customer_ID}, '${name}', '${FirstName}', '${LastName}', ${PhoneNumber}, ${PhoneNumber2}, '${StreetAddress1}', '${StreetAddress2}', '${Area}', ${District_ID}, ${State_ID}, ${Pincode}, '${Nationality}')
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

const getCustomerSchemes = async (req, res) => {
  try {
    const { id } = req.params;
    const schemes = await executeQuery(
      'SELECT Scheme_ID FROM Scheme_Members WHERE Customer_ID = @param0',
      [{ value: id, type: sql.VarChar(50) }]
    );
    res.json(schemes.map(s => s.Scheme_ID));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const assignSchemes = async (req, res) => {
  const connection = await sql.connect(require('../config/database').dbConfig);
  const transaction = new sql.Transaction(connection);
  
  try {
    const { id } = req.params;
    const { schemeIds } = req.body; // Array of Scheme_IDs

    await transaction.begin();
    const request = new sql.Request(transaction);

    // 1. Delete existing assignments
    await request.input('customerId', sql.VarChar(50), id)
                 .query('DELETE FROM Scheme_Members WHERE Customer_ID = @customerId');

    // 2. Delete existing dues (Resetting dues for the customer)
    // Note: This assumes we want to reset dues when re-assigning. 
    // If preserving history is needed, this logic needs to be more complex.
    const deleteDuesReq = new sql.Request(transaction);
    await deleteDuesReq.input('customerId', sql.VarChar(50), id)
                       .query('DELETE FROM Scheme_Due WHERE Customer_ID = @customerId');

    // 3. Insert new assignments and generate dues
    if (schemeIds && schemeIds.length > 0) {
      for (const schemeId of schemeIds) {
        // Insert Member
        const insertMemberReq = new sql.Request(transaction);
        await insertMemberReq.input('customerId', sql.VarChar(50), id)
                             .input('schemeId', sql.Int, schemeId)
                             .query('INSERT INTO Scheme_Members (Customer_ID, Scheme_ID) VALUES (@customerId, @schemeId)');

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
                                  .input('dueNumber', sql.Int, i)
                                  .input('dueDate', sql.Date, dueDate)
                                  .input('dueAmount', sql.Decimal(15, 2), scheme.Amount_per_month)
                                  .query(`
                                      INSERT INTO Scheme_Due (Scheme_ID, Customer_ID, Due_number, Due_date, Due_amount)
                                      VALUES (@schemeId, @customerId, @dueNumber, @dueDate, @dueAmount)
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
  getCustomerSchemes, assignSchemes
};
