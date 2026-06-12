const { executeQuery, executeInsertGetId, executeUpdate } = require('../models/db');
const sql = require('mssql');
const ExcelJS = require('exceljs');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// ✅ INLINE CSV/Excel utils - NO external dependencies
const convertToCsv = (data) => {
  if (!data.length) return 'Scheme_ID,Name,Total_Amount,Amount_per_month,Period,Number_of_due,Month_from,Month_to,Bonus_Amount\n';
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(val => 
      typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
    ).join(',')
  ).join('\n');
  return `${headers}\n${rows}`;
};

const parseExcel = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0]; // Get first sheet
  const jsonData = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip headers

    // exceljs row.values is 1-indexed, so index 1 is column A
    // We need to map this carefully based on expected columns
    // Assuming columns order: Name, Total_Amount, Amount_per_month, Period, Number_of_due, Month_from, Month_to, Bonus_Percentage
    
    // row.values might look like [empty, val1, val2, ...] because of 1-indexing
    const rowVal = row.values;
    
    const rowData = {
        Name: rowVal[1],
        Total_Amount: rowVal[2],
        Amount_per_month: rowVal[3],
        Period: rowVal[4],
        Number_of_due: rowVal[5],
        Month_from: rowVal[6],
        Month_to: rowVal[7],
        Bonus_Amount: rowVal[8]
    };
    jsonData.push(rowData);
  });
  return jsonData;
};

const getAllSchemes = async (req, res) => {
  try {
    const { page = 1, limit, search = '' } = req.query;

    let query = `
      SELECT cm.Scheme_ID, cm.Name, cm.Total_Amount, cm.Amount_per_month, 
             cm.Period, cm.Number_of_due, cm.Month_from, cm.Month_to, cm.Bonus_Amount,
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
               cm.Period, cm.Number_of_due, cm.Month_from, cm.Month_to, cm.Bonus_Amount
      ORDER BY cm.Amount_per_month ASC 
    `;

    // Only add pagination if limit is provided
    if (limit) {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += `OFFSET ${offset} ROWS FETCH NEXT ${parseInt(limit)} ROWS ONLY`;
    }

    const schemes = await executeQuery(query, params);

    // Total count — parameterized; never concatenate user input
    const totalQuery = search
      ? 'SELECT COUNT(*) as total FROM Chit_Master cm WHERE cm.Name LIKE @param0'
      : 'SELECT COUNT(*) as total FROM Chit_Master cm';
    const totalParams = search ? [{ value: `%${search}%`, type: sql.VarChar }] : [];
    const totalResult = await executeQuery(totalQuery, totalParams);

    // ✅ FRONTEND EXPECTS: { schemes: [], total: 0 }
    return res.json({
      schemes,
      total: totalResult[0]?.total || 0,
      page: parseInt(page),
      limit: limit ? parseInt(limit) : schemes.length
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch schemes', error);
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
      return sendError(res, 'Scheme not found', null, 404);
    }
    res.json(scheme[0]);
  } catch (error) {
    return sendError(res, 'Failed to fetch scheme details', error);
  }
};

const createScheme = async (req, res) => {
  try {
    const { Name, Total_Amount, Amount_per_month, Period, Number_of_due, Month_from, Month_to, Bonus_Amount } = req.body;
    
    const result = await executeInsertGetId(
      `INSERT INTO Chit_Master (Name, Total_Amount, Amount_per_month, Period, Number_of_due, Month_from, Month_to, Bonus_Amount) 
       OUTPUT INSERTED.Scheme_ID
       VALUES (@param0,@param1,@param2,@param3,@param4,@param5,@param6,@param7)`,
      [
        { value: Name, type: sql.VarChar(100) },
        { value: parseFloat(Total_Amount), type: sql.Decimal(15,2) },
        { value: parseFloat(Amount_per_month), type: sql.Decimal(15,2) },
        { value: parseInt(Period), type: sql.Int },
        { value: parseInt(Number_of_due), type: sql.Int },
        { value: Month_from, type: sql.Date },
        { value: Month_to, type: sql.Date },
        { value: Bonus_Amount ? parseFloat(Bonus_Amount) : 0, type: sql.Decimal(15, 2) }
      ]
    );
    
    return sendSuccess(res, 'Scheme created successfully', { schemeId: result.Scheme_ID }, 201);
  } catch (error) {
    return sendError(res, 'Failed to create scheme', error);
  }
};

const updateScheme = async (req, res) => {
  try {
    const { id } = req.params;
    const { Name, Total_Amount, Amount_per_month, Period, Number_of_due, Month_from, Month_to, Bonus_Amount } = req.body;
    
    await executeUpdate(
      `UPDATE Chit_Master SET 
       Name=@param1, Total_Amount=@param2, Amount_per_month=@param3, 
       Period=@param4, Number_of_due=@param5, Month_from=@param6, Month_to=@param7, Bonus_Amount=@param8
       WHERE Scheme_ID = @param0`,
      [
        { value: parseInt(id), type: sql.Int },
        { value: Name, type: sql.VarChar(100) },
        { value: parseFloat(Total_Amount), type: sql.Decimal(15,2) },
        { value: parseFloat(Amount_per_month), type: sql.Decimal(15,2) },
        { value: parseInt(Period), type: sql.Int },
        { value: parseInt(Number_of_due), type: sql.Int },
        { value: Month_from, type: sql.Date },
        { value: Month_to, type: sql.Date },
        { value: Bonus_Amount ? parseFloat(Bonus_Amount) : 0, type: sql.Decimal(15, 2) }
      ]
    );
    
    return sendSuccess(res, 'Scheme updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update scheme', error);
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
    
    return sendSuccess(res, 'Scheme and all associated data deleted successfully');
  } catch (error) {
    return sendError(res, 'Failed to delete scheme', error);
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
    // res.status(500).json({ error: error.message });
    if (!res.headersSent) return sendError(res, 'Download failed', error);
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
        c.Customer_Code,
        c.Name as Customer_Name, 
        c.Phone_Number, 
        cm.Scheme_ID,
        cm.Name as Scheme_Name,
        cm.Amount_per_month,
        cm.Month_from,
        cm.Month_to,
        cm.Total_Amount,
        cm.Bonus_Amount
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
      query += ` AND (sm.Fund_Number = @param${paramIndex} OR sm.Fund_Number LIKE @param${paramIndex + 1})`;
      params.push({ value: fund_number, type: sql.VarChar(50) });
      params.push({ value: `%/${fund_number}`, type: sql.VarChar(50) });
      paramIndex += 2;
    }
    
    if (search) {
        query += ` AND (c.Name LIKE @param${paramIndex} OR c.Phone_Number LIKE @param${paramIndex} OR sm.Fund_Number LIKE @param${paramIndex})`;
        params.push({ value: `%${search}%`, type: sql.VarChar });
        paramIndex++;
    }

    // due_months: comma-separated 'YYYY-MM' values. Restricts to members who
    // have at least one UNPAID due whose due_date falls in any of those months.
    const rawDueMonths = req.query.due_months;
    if (rawDueMonths) {
      const months = (Array.isArray(rawDueMonths) ? rawDueMonths : String(rawDueMonths).split(','))
        .map(s => String(s).trim())
        .filter(s => /^\d{4}-\d{2}$/.test(s));
      if (months.length > 0) {
        const placeholders = months.map((_, i) => `@dueMonth${i}`).join(',');
        query += ` AND EXISTS (
          SELECT 1 FROM Scheme_Due sd
          WHERE sd.Fund_Number = sm.Fund_Number
            AND (sd.Recd_amount IS NULL OR sd.Recd_amount < sd.Due_amount)
            AND FORMAT(sd.Due_date, 'yyyy-MM') IN (${placeholders})
        )`;
        months.forEach((m, i) => {
          params.push({ name: `dueMonth${i}`, value: m, type: sql.VarChar(7) });
        });
      }
    }

    // Total Count Query — reuse the WHERE clause from the main query.
    // Important: only split on the FIRST 'WHERE'; the EXISTS subquery contains
    // its own WHERE and a naive split('WHERE')[1] truncates the predicate.
    const firstWhereIdx = query.indexOf('WHERE');
    const wherePredicate = firstWhereIdx >= 0 ? query.slice(firstWhereIdx + 'WHERE'.length) : '';
    const countQueryStr = `SELECT COUNT(*) as total FROM Scheme_Members sm
                           JOIN Customer_Master c ON sm.Customer_ID = c.Customer_ID
                           JOIN Chit_Master cm ON sm.Scheme_ID = cm.Scheme_ID
                           WHERE ${wherePredicate}`;

   
    query += ` ORDER BY CAST(SUBSTRING(sm.Fund_Number, LEN(sm.Fund_Number) - CHARINDEX('/', REVERSE(sm.Fund_Number)) + 2, LEN(sm.Fund_Number)) AS INT) ASC OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;

    
    const [members, totalResult] = await Promise.all([
      executeQuery(query, params),
      executeQuery(countQueryStr, params)
    ]);

    return sendSuccess(res, 'Scheme members fetched successfully', {
      members,
      pagination: {
        totalRecords: totalResult[0]?.total || 0,
        totalPages: Math.ceil((totalResult[0]?.total || 0) / limit),
        currentPage: parseInt(page),
        pageSize: parseInt(limit)
      }
    });

  } catch (error) {
    return sendError(res, 'Failed to fetch scheme members', error);
  }
};

const uploadSchemes = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', null, 400);
    }

    const schemes = await parseExcel(req.file.buffer);
    
    if (!schemes || schemes.length === 0) {
      return sendError(res, 'No schemes found in file', null, 400);
    }

     const connection = await sql.connect(require('../config/database').dbConfig);
     const transaction = new sql.Transaction(connection);

    try {
        await transaction.begin();

        const table = new sql.Table('Chit_Master');
        table.create = false;
        
        // Define columns
        // Name, Total_Amount, Amount_per_month, Period, Number_of_due, Month_from, Month_to, Bonus_Amount
        table.columns.add('Name', sql.VarChar(100), { nullable: false });
        table.columns.add('Total_Amount', sql.Decimal(15, 2), { nullable: false });
        table.columns.add('Amount_per_month', sql.Decimal(15, 2), { nullable: false });
        table.columns.add('Period', sql.Int, { nullable: false });
        table.columns.add('Number_of_due', sql.Int, { nullable: false });
        table.columns.add('Month_from', sql.Date, { nullable: true });
        table.columns.add('Month_to', sql.Date, { nullable: true });
        table.columns.add('Bonus_Amount', sql.Decimal(15, 2), { nullable: true });
        
        let successCount = 0;
        let errorCount = 0;

        for (const scheme of schemes) {
             // Basic validation
             if (!scheme.Name || !scheme.Total_Amount) {
                 console.warn('Skipping invalid scheme row:', scheme);
                 errorCount++;
                 continue;
             }
             
             table.rows.add(
                scheme.Name,
                parseFloat(scheme.Total_Amount),
                parseFloat(scheme.Amount_per_month),
                parseInt(scheme.Period),
                parseInt(scheme.Number_of_due),
                scheme.Month_from ? new Date(scheme.Month_from) : null,
                scheme.Month_to ? new Date(scheme.Month_to) : null,
                scheme.Bonus_Amount ? parseFloat(scheme.Bonus_Amount) : 0
             );
             successCount++;
        }

        const request = new sql.Request(transaction);
        await request.bulk(table);

        await transaction.commit();
        return sendSuccess(res, `Processed ${schemes.length} rows. Success: ${successCount}, Errors: ${errorCount} (Validation)`);

    } catch (error) {
        if (transaction.active) await transaction.rollback();
        return sendError(res, 'Failed to upload schemes - Bulk Insert Error', error);
    }
  } catch (error) {
    return sendError(res, 'Failed to upload schemes', error);
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
