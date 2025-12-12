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
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

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
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;

    const schemes = await executeQuery(query, params);

    // Total count
    const totalQuery = `SELECT COUNT(*) as total FROM Chit_Master cm ${search ? `WHERE cm.Name LIKE '${search.replace(/'/g, "''")}%'` : ''}`;
    const totalResult = await executeQuery(totalQuery);

    // ✅ FRONTEND EXPECTS: { schemes: [], total: 0 }
    res.json( 
      schemes
    );
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
    
    // Check for dependencies in Scheme_Members
    const members = await executeQuery(
      'SELECT COUNT(*) as count FROM Scheme_Members WHERE Scheme_ID = @param0',
      [{ value: parseInt(id), type: sql.Int }]
    );

    if (members[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete scheme. There are members assigned to this scheme.' });
    }

    // Check for dependencies in Payment_Master
    const payments = await executeQuery(
      'SELECT COUNT(*) as count FROM Payment_Master WHERE Scheme_ID = @param0',
      [{ value: parseInt(id), type: sql.Int }]
    );

    if (payments[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete scheme. There are payments associated with this scheme.' });
    }

    await executeUpdate(
      'DELETE FROM Chit_Master WHERE Scheme_ID = @param0', 
      [{ value: parseInt(id), type: sql.Int }]
    );
    res.json({ success: true, message: 'Scheme deleted successfully' });
  } catch (error) {
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

module.exports = { 
  getAllSchemes, 
  getSchemeById, 
  createScheme, 
  updateScheme, 
  deleteScheme, 
  downloadSchemes 
};
