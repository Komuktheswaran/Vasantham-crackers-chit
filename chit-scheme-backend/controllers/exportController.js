const { executeQuery } = require('../models/db');
const sql = require('mssql');
const { convertToCSV, formatDateForCSV } = require('../utils/csvHelper');

/**
 * Export customers with optional filters
 */
const exportCustomers = async (req, res) => {
  try {
    const { area, state, district, scheme_id, fund_number, customer_type } = req.query;

    let query = `
      SELECT DISTINCT
        c.Customer_ID,
        c.Name,
        c.Phone_Number,
        c.Phone_Number2,
        c.Address1,
        c.Address2,
        concat(c.Address1, ' ', c.Address2) as Combined_Address,
        c.Area,
        d.District_Name as District,
        s.State_Name as State,
        c.Pincode,
        c.Customer_Type,
        c.Reference_Name,
        (SELECT STRING_AGG(cm.Name, ', ') 
         FROM Scheme_Members sm 
         JOIN Chit_Master cm ON sm.Scheme_ID = cm.Scheme_ID 
         WHERE sm.Customer_ID = c.Customer_ID) as Assigned_Schemes,
        (SELECT STRING_AGG(sm.Fund_Number, ', ') 
         FROM Scheme_Members sm 
         WHERE sm.Customer_ID = c.Customer_ID) as Assigned_Fund_Numbers
      FROM Customer_Master c
      LEFT JOIN District_Master d ON c.District_ID = d.District_ID
      LEFT JOIN State_Master s ON c.State_ID = s.State_ID
    `;

    const params = [];
    const whereClauses = [];
    let paramIndex = 0;

    // Add scheme filter if provided
    if (scheme_id || fund_number) {
      if (!query.includes('INNER JOIN Scheme_Members')) {
         query += ` INNER JOIN Scheme_Members sm ON c.Customer_ID = sm.Customer_ID`;
      }
    }

    if (scheme_id) {
       whereClauses.push(`sm.Scheme_ID = @param${paramIndex}`);
       params.push({ value: parseInt(scheme_id), type: sql.Int });
       paramIndex++;
    }

    // Add fund_number filter
    if (fund_number) {
        whereClauses.push(`sm.Fund_Number LIKE @param${paramIndex}`);
        params.push({ value: `%${fund_number}%`, type: sql.VarChar(50) });
        paramIndex++;
    }

    // Add customer_type filter
    if (customer_type) {
        whereClauses.push(`c.Customer_Type LIKE @param${paramIndex}`);
        params.push({ value: `%${customer_type}%`, type: sql.VarChar(50) });
        paramIndex++;
    }

    // Add area filter
    if (area) {
      whereClauses.push(`c.Area LIKE @param${paramIndex}`);
      params.push({ value: `%${area}%`, type: sql.VarChar(100) });
      paramIndex++;
    }

    // Add state filter
    if (state) {
      whereClauses.push(`s.State_Name = @param${paramIndex}`);
      params.push({ value: state, type: sql.VarChar(100) });
      paramIndex++;
    }

    // Add district filter
    if (district) {
      whereClauses.push(`d.District_Name = @param${paramIndex}`);
      params.push({ value: district, type: sql.VarChar(100) });
      paramIndex++;
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY c.Customer_ID`;

    const customers = await executeQuery(query, params);

    // Define CSV columns
    const columns = [
      { key: 'Customer_ID', header: 'Customer ID' },
      { key: 'Name', header: 'Customer Name' },
      { key: 'Phone_Number', header: 'Phone Number' },
      { key: 'Combined_Address', header: 'Address' },
      { key: 'Area', header: 'Area' },
      { key: 'Pincode', header: 'Pincode' },
      { key: 'State', header: 'State' },
      { key: 'Customer_Type', header: 'Customer Type' },
      { key: 'Reference_Name', header: 'Reference Name' },
      { key: 'Assigned_Schemes', header: 'Schemes Assigned' },
      { key: 'Assigned_Fund_Numbers', header: 'Fund Number' }
    ];

    const csv = convertToCSV(customers, columns);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send('\ufeff' + csv); // Add BOM for proper UTF-8 encoding in Excel
  } catch (error) {
    console.error('❌ exportCustomers Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Export payments with optional filters
 */
const exportPayments = async (req, res) => {
  try {
    const { date_from, date_to, customer_id, scheme_id, transaction_id } = req.query;
    
    console.log('📥 Payment Export Filters:', { date_from, date_to, customer_id, scheme_id, transaction_id });

    let query = `
      SELECT 
        pm.Pay_ID,
        pm.Customer_ID,
        c.Name as Customer_Name,
        cm.Name as Scheme_Name,
        pm.Amount_Received,
        pm.Amount_Received_date,
        pm.Transaction_ID,
        pm.Due_number,
        pm.Fund_Number,
        pm.Payment_Mode,
        pm.UPI_Phone_Number,
        sd.Due_date,
        sd.Due_amount,
        c.Phone_Number,
        concat(c.Address1, ' ', c.Address2) as Combined_Address,
        c.Area,
        c.Pincode,
        s.State_Name as State,
        c.Customer_Type,
        c.Reference_Name,
        (SELECT STRING_AGG(cm2.Name, ', ') 
         FROM Scheme_Members sm 
         JOIN Chit_Master cm2 ON sm.Scheme_ID = cm2.Scheme_ID 
         WHERE sm.Customer_ID = c.Customer_ID) as Assigned_Schemes
      FROM Payment_Master pm
      JOIN Customer_Master c ON pm.Customer_ID = c.Customer_ID
      JOIN Chit_Master cm ON pm.Scheme_ID = cm.Scheme_ID
      LEFT JOIN State_Master s ON c.State_ID = s.State_ID
      LEFT JOIN Scheme_Due sd ON pm.Scheme_ID = sd.Scheme_ID AND pm.Due_number = sd.Due_number
    `;

    const params = [];
    const whereClauses = [];
    let paramIndex = 0;

    // Add date range filter
    if (date_from) {
      whereClauses.push(`pm.Amount_Received_date >= @param${paramIndex}`);
      params.push({ value: date_from, type: sql.Date });
      paramIndex++;
    }

    if (date_to) {
      whereClauses.push(`pm.Amount_Received_date <= @param${paramIndex}`);
      params.push({ value: date_to, type: sql.Date });
      paramIndex++;
    }

    // Add customer filter
    if (customer_id) {
      whereClauses.push(`pm.Customer_ID = @param${paramIndex}`);
      params.push({ value: customer_id, type: sql.VarChar(50) });
      paramIndex++;
    }

    // Add scheme filter
    if (scheme_id) {
      whereClauses.push(`pm.Scheme_ID = @param${paramIndex}`);
      params.push({ value: parseInt(scheme_id), type: sql.Int });
      paramIndex++;
    }

    // Add transaction ID filter
    if (transaction_id) {
      whereClauses.push(`pm.Transaction_ID LIKE @param${paramIndex}`);
      params.push({ value: `%${transaction_id}%`, type: sql.VarChar(100) });
      paramIndex++;
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY pm.Amount_Received_date DESC`;
    
    console.log('📊 Payment Export Query:', query);
    console.log('📊 Payment Export Params:', params);

    const payments = await executeQuery(query, params);
    
    console.log(`✅ Found ${payments.length} payment records`);

    // Format dates and handle Transaction ID logic
    const formattedPayments = payments.map(p => {
      let paymentMode = p.Payment_Mode || 'Cash'; // Default to Cash if null
      
      let transactionDisplay = p.Transaction_ID;
      if (paymentMode.toLowerCase() === 'cash') {
        transactionDisplay = 'Cash';
      } else if (!transactionDisplay) {
         transactionDisplay = '-';
      }

      return {
        ...p,
        Payment_Mode: paymentMode,
        Amount_Received_date: formatDateForCSV(p.Amount_Received_date),
        Due_date: formatDateForCSV(p.Due_date),
        Transaction_Display: transactionDisplay
      };
    });

    // Define CSV columns
    const columns = [
      { key: 'Due_number', header: 'Due Number' },
      { key: 'Amount_Received', header: 'Amount Received' },
      { key: 'Payment_Mode', header: 'Payment Mode' },
      { key: 'UPI_Phone_Number', header: 'UPI Number' },
      { key: 'Transaction_Display', header: 'Transaction Number' },
      { key: 'Amount_Received_date', header: 'Payment Date' },
      { key: 'Assigned_Schemes', header: 'Assigned Schemes' },
      { key: 'Fund_Number', header: 'Fund Number' },
      { key: 'Customer_ID', header: 'Customer ID' },
      { key: 'Customer_Name', header: 'Customer Name' },
      { key: 'Phone_Number', header: 'Phone Number' },
      { key: 'Combined_Address', header: 'Address' },
      { key: 'Area', header: 'Area' },
      { key: 'Pincode', header: 'Pincode' },
      { key: 'State', header: 'State' },
      { key: 'Customer_Type', header: 'Customer Type' },
      { key: 'Reference_Name', header: 'Reference Name' }
    ];

    const csv = convertToCSV(formattedPayments, columns);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=payments.csv');
    res.send('\ufeff' + csv);
  } catch (error) {
    console.error('❌ exportPayments Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Export schemes with optional filters
 */
const exportSchemes = async (req, res) => {
  try {
    const { active_only, search } = req.query;

    let query = `
      SELECT 
        cm.Scheme_ID,
        cm.Name,
        cm.Total_Amount,
        cm.Period,
        cm.Amount_per_month,
        cm.Number_of_due,
        cm.Month_from,
        cm.Month_to,
        COUNT(DISTINCT sm.Customer_ID) as Member_Count
      FROM Chit_Master cm
      LEFT JOIN Scheme_Members sm ON cm.Scheme_ID = sm.Scheme_ID
    `;

    // Add search filter
    if (search) {
      query += ` WHERE cm.Name LIKE '%${search.replace(/'/g, "''")}%'`;
    }

    query += `
      GROUP BY cm.Scheme_ID, cm.Name, cm.Total_Amount, cm.Amount_per_month, cm.Number_of_due, cm.Period, cm.Month_from, cm.Month_to
    `;

    // Add active filter after grouping
    if (active_only === 'true') {
      query += ` HAVING COUNT(DISTINCT sm.Customer_ID) > 0`;
    }

    query +=` ORDER BY cm.Scheme_ID`;

    const schemes = await executeQuery(query);

    // Format dates
    const formattedSchemes = schemes.map(s => ({
      ...s,
      Month_from: formatDateForCSV(s.Month_from),
      Month_to: formatDateForCSV(s.Month_to),
      Status: s.Member_Count > 0 ? 'Active' : 'Inactive'
    }));

    // Define CSV columns
    const columns = [
      { key: 'Scheme_ID', header: 'Scheme ID' },
      { key: 'Name', header: 'Name' },
      { key: 'Total_Amount', header: 'Total Amount' },
      { key: 'Period', header: 'Period' },
      { key: 'Amount_per_month', header: 'Amount Per Month' },
      { key: 'Number_of_due', header: 'Number of Dues' },
      { key: 'Month_from', header: 'Start Month Date' },
      { key: 'Month_to', header: 'End Month Date' },
      { key: 'Member_Count', header: 'Customer Assigned' }
    ];

    const csv = convertToCSV(formattedSchemes, columns);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=schemes.csv');
    res.send('\ufeff' + csv);
  } catch (error) {
    console.error('❌ exportSchemes Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  exportCustomers,
  exportPayments,
  exportSchemes
};
