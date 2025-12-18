const { executeQuery, executeInsertGetId, executeUpdate } = require('../models/db');
const sql = require('mssql');
const xlsx = require('xlsx');

// ✅ INLINE CSV/Excel utils - NO external dependencies
const convertToCsv = (data) => {
  if (!data.length) return 'Scheme_ID,Name,Total_Amount,Amount_per_month,Period,Number_of_due,Month_from,Month_to\n';
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(val => 
      typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
    ).join(',')
  ).join('\n');
  return `${headers}\n${rows}`;
};

const parseExcel = (buffer) => {
  const workbook = require('xlsx').read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return require('xlsx').utils.sheet_to_json(worksheet);
};

const getAllSchemes = async (req, res) => {
  try {
    const { page = 1, limit, search = '' } = req.query;

    let query = `
      SELECT cm.*, 
             ISNULL(COUNT(sm.Customer_ID), 0) as member_count
      FROM Chit_Master cm
      LEFT JOIN Scheme_Members sm ON cm.Scheme_ID = sm.Scheme_ID
    `;
    const params = [];

    if (search) {
      query += ' WHERE cm.Name LIKE @param0';
      params.push({ value: `%${search}%`, type: sql.VarChar });
    }

    query += `
      GROUP BY cm.Scheme_ID, cm.Name, cm.Total_Amount, cm.Amount_per_month, 
               cm.Period, cm.Number_of_due, cm.Month_from, cm.Month_to
      ORDER BY cm.Scheme_ID DESC 
    `;

    // Only add pagination if limit is provided
    if (limit) {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += `OFFSET ${offset} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
    }

    const schemes = await executeQuery(query, params);

    // Total count
    const totalQuery = `SELECT COUNT(*) as total FROM Chit_Master cm ${search ? `WHERE cm.Name LIKE '%${search.replace(/'/g, "''")}%'` : ''}`;
    const totalResult = await executeQuery(totalQuery);

    // ✅ FRONTEND EXPECTS: { schemes: [], total: 0 }
    res.json({
      schemes,
      total: totalResult[0]?.total || 0,
      page: parseInt(page),
      limit: limit ? parseInt(limit) : schemes.length
    });
  } catch (error) {
    console.error('❌ getAllSchemes Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getSchemeById = async (req, res) => {
  try {
    const { id } = req.params;
    const scheme = await executeQuery(
      'SELECT * FROM Chit_Master WHERE Scheme_ID = @param0', 
      [{ value: parseInt(id), type: sql.Int }]
    );
    
    if (scheme.length === 0) {
      return res.status(404).json({ error: 'Scheme not found' });
    }
    res.json(scheme[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createScheme = async (req, res) => {
  try {
    const { Name, Total_Amount, Amount_per_month, Period, Number_of_due, Month_from, Month_to } = req.body;
    
    const result = await executeInsertGetId(
      `INSERT INTO Chit_Master (Name, Total_Amount, Amount_per_month, Period, Number_of_due, Month_from, Month_to) 
       OUTPUT INSERTED.Scheme_ID
       VALUES (@param0,@param1,@param2,@param3,@param4,@param5,@param6)`,
      [
        { value: Name, type: sql.VarChar(100) },
        { value: parseFloat(Total_Amount), type: sql.Decimal(15,2) },
        { value: parseFloat(Amount_per_month), type: sql.Decimal(15,2) },
        { value: parseInt(Period), type: sql.Int },
        { value: parseInt(Number_of_due), type: sql.Int },
        { value: Month_from, type: sql.Date },
        { value: Month_to, type: sql.Date }
      ]
    );
    
    res.status(201).json({ 
      success: true, 
      schemeId: result.Scheme_ID, 
      message: 'Scheme created successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateScheme = async (req, res) => {
  try {
    const { id } = req.params;
    const { Name, Total_Amount, Amount_per_month, Period, Number_of_due, Month_from, Month_to } = req.body;
    
    await executeUpdate(
      `UPDATE Chit_Master SET 
       Name=@param1, Total_Amount=@param2, Amount_per_month=@param3, 
       Period=@param4, Number_of_due=@param5, Month_from=@param6, Month_to=@param7
       WHERE Scheme_ID = @param0`,
      [
        { value: parseInt(id), type: sql.Int },
        { value: Name, type: sql.VarChar(100) },
        { value: parseFloat(Total_Amount), type: sql.Decimal(15,2) },
        { value: parseFloat(Amount_per_month), type: sql.Decimal(15,2) },
        { value: parseInt(Period), type: sql.Int },
        { value: parseInt(Number_of_due), type: sql.Int },
        { value: Month_from, type: sql.Date },
        { value: Month_to, type: sql.Date }
      ]
    );
    
    res.json({ success: true, message: 'Scheme updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteScheme = async (req, res) => {
  try {
    const { id } = req.params;
    const schemeId = parseInt(id);
    
    // We using a sequential delete approach instead of strict transaction object for simplicity with the current db helper
    // 1. Delete dependent Payments
    await executeUpdate(
      'DELETE FROM Payment_Master WHERE Scheme_ID = @param0',
      [{ value: schemeId, type: sql.Int }]
    );

    // 2. Delete dependent Scheme Dues
    await executeUpdate(
      'DELETE FROM Scheme_Due WHERE Scheme_ID = @param0',
      [{ value: schemeId, type: sql.Int }]
    );

    // 3. Delete dependent Scheme Members
    await executeUpdate(
      'DELETE FROM Scheme_Members WHERE Scheme_ID = @param0',
      [{ value: schemeId, type: sql.Int }]
    );

    // 4. Delete the Scheme itself
    await executeUpdate(
      'DELETE FROM Chit_Master WHERE Scheme_ID = @param0', 
      [{ value: schemeId, type: sql.Int }]
    );
    
    res.json({ success: true, message: 'Scheme and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete scheme error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Simplified download (CSV only for now)
const downloadSchemes = async (req, res) => {
  try {
    const schemes = await executeQuery('SELECT * FROM Chit_Master ORDER BY Scheme_ID DESC');
    const csvData = convertToCsv(schemes);
    
    res.header('Content-Type', 'text/csv');
    res.attachment('schemes.csv');
    res.send(csvData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSchemeMembers = async (req, res) => {
  try {
    const { page = 1, limit = 20, scheme_id, customer_id, fund_number, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT 
        sm.Fund_Number, 
        sm.Status, 
        sm.Join_date, 
        c.Customer_ID,
        c.Name as Customer_Name, 
        c.Phone_Number, 
        cm.Scheme_ID,
        cm.Name as Scheme_Name,
        cm.Amount_per_month,
        cm.Month_from,
        cm.Month_to
      FROM Scheme_Members sm
      JOIN Customer_Master c ON sm.Customer_ID = c.Customer_ID
      JOIN Chit_Master cm ON sm.Scheme_ID = cm.Scheme_ID
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 0;

    if (scheme_id && scheme_id !== 'null' && scheme_id !== 'undefined') {
      query += ` AND sm.Scheme_ID = @param${paramIndex}`;
      params.push({ value: parseInt(scheme_id), type: sql.Int });
      paramIndex++;
    }

    if (customer_id && customer_id !== 'null' && customer_id !== 'undefined') {
      query += ` AND sm.Customer_ID = @param${paramIndex}`;
      params.push({ value: customer_id, type: sql.VarChar(50) });
      paramIndex++;
    }

    if (fund_number && fund_number !== 'null' && fund_number !== 'undefined') {
      query += ` AND sm.Fund_Number LIKE @param${paramIndex}`;
      params.push({ value: `%${fund_number}%`, type: sql.VarChar(50) });
      paramIndex++;
    }
    
    if (search) {
        query += ` AND (c.Name LIKE @param${paramIndex} OR c.Phone_Number LIKE @param${paramIndex} OR sm.Fund_Number LIKE @param${paramIndex})`;
        params.push({ value: `%${search}%`, type: sql.VarChar });
        paramIndex++;
    }

    // Total Count Query
    const countQueryStr = `SELECT COUNT(*) as total FROM Scheme_Members sm 
                           JOIN Customer_Master c ON sm.Customer_ID = c.Customer_ID
                           JOIN Chit_Master cm ON sm.Scheme_ID = cm.Scheme_ID 
                           WHERE ` + query.split('WHERE')[1]; // Reuse WHERE clause

    query += ` ORDER BY sm.Join_date DESC OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;

    const [members, totalResult] = await Promise.all([
      executeQuery(query, params),
      executeQuery(countQueryStr, params)
    ]);

    res.json({
      members,
      pagination: {
        totalRecords: totalResult[0]?.total || 0,
        totalPages: Math.ceil((totalResult[0]?.total || 0) / limit),
        currentPage: parseInt(page),
        pageSize: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ getSchemeMembers Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const uploadSchemes = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const schemes = parseExcel(req.file.buffer);
    
    if (!schemes || schemes.length === 0) {
      return res.status(400).json({ error: 'No schemes found in file' });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const scheme of schemes) {
      try {
         // Basic validation
         if (!scheme.Name || !scheme.Total_Amount) {
             console.warn('Skipping invalid scheme row:', scheme);
             errorCount++;
             continue;
         }

         await executeInsertGetId(
          `INSERT INTO Chit_Master (Name, Total_Amount, Amount_per_month, Period, Number_of_due, Month_from, Month_to) 
           VALUES (@param0,@param1,@param2,@param3,@param4,@param5,@param6)`,
          [
            { value: scheme.Name, type: sql.VarChar(100) },
            { value: parseFloat(scheme.Total_Amount), type: sql.Decimal(15,2) },
            { value: parseFloat(scheme.Amount_per_month), type: sql.Decimal(15,2) },
            { value: parseInt(scheme.Period), type: sql.Int },
            { value: parseInt(scheme.Number_of_due), type: sql.Int },
            { value: scheme.Month_from ? new Date(scheme.Month_from) : null, type: sql.Date },
            { value: scheme.Month_to ? new Date(scheme.Month_to) : null, type: sql.Date }
          ]
        );
        successCount++;
      } catch (err) {
          console.error('Error inserting scheme:', err);
          errorCount++;
      }
    }

    res.json({ 
        success: true, 
        message: `Processed ${schemes.length} rows. Success: ${successCount}, Errors: ${errorCount}` 
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { 
  getAllSchemes, 
  getSchemeById, 
  createScheme, 
  updateScheme, 
  deleteScheme, 
  downloadSchemes,
  getSchemeMembers,
  uploadSchemes
};
