const {
  executeQuery,
  executeInsertGetId,
  executeUpdate,
} = require("../models/db");
const sql = require("mssql");
const { convertToCsv, parseExcel } = require("../utils");
const xlsx = require("xlsx");
const path = require("path");
const { sendWhatsappMessage } = require("../services/whatsappService");

// Helper to generate omer ID in format: id/2026/001
const generateCustomerId = async () => {
  const year = new Date().getFullYear();
  const prefix = `id/${year}/`;

  // Query for latest omer ID with this year's prefix
  const result = await executeQuery(
    `
    SELECT TOP 1 omer_ID 
    FROM omer_Master 
    WHERE omer_ID LIKE @param0
    ORDER BY omer_ID DESC
  `,
    [{ value: `${prefix}%`, type: sql.VarChar }]
  );

  let nextNumber = 1;
  if (result.length > 0) {
    const lastId = result[0].omer_ID;
    const match = lastId.match(/\/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
};

// Helper to generate Fund Number in format: fund/2026/001
const generateFundNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `fund/${year}/`;

  // Query for latest fund number with this year's prefix
  const result = await executeQuery(
    `
    SELECT TOP 1 Fund_Number 
    FROM Scheme_Members
    WHERE Fund_Number LIKE @param0
    ORDER BY Fund_Number DESC
  `,
    [{ value: `${prefix}%`, type: sql.VarChar }]
  );

  let nextNumber = 1;
  if (result.length > 0) {
    const lastFund = result[0].Fund_Number;
    const match = lastFund.match(/\/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
};

const getAllCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit,
      search = "",
      state,
      district,
      area,
      scheme_id,
    } = req.query;

    // Build base query
    let baseQuery = `
      SELECT c.omer_ID, c.omer_Code, c.Name, c.Reference_Name, c.omer_Type, 
             c.Phone_Number, c.Area, c.State_ID, c.District_ID, c.Pincode,
             c.Address1, c.Address2,
             ISNULL(d.District_Name, 'N/A') as District_Name, 
             ISNULL(s.State_Name, 'N/A') as State_Name
    `;

    let fromQuery = `
      FROM omer_Master c 
      LEFT JOIN District_Master d ON c.District_ID = d.District_ID 
      LEFT JOIN State_Master s ON c.State_ID = s.State_ID
    `;

    if (scheme_id || req.query.fund_number) {
      fromQuery += ` INNER JOIN Scheme_Members sm ON c.omer_ID = sm.omer_ID`;
    }

    let whereClause = "WHERE 1=1";
    const params = [];
    let paramIndex = 0;

    // Search functionality - Updated for Name, Phone, omer Code, omer ID, and Fund Number
    if (search) {
      whereClause += ` AND (
        c.Name LIKE @param${paramIndex} 
        OR CAST(c.Phone_Number AS VARCHAR(20)) LIKE @param${paramIndex}
        OR c.omer_Code LIKE @param${paramIndex}
        OR c.omer_ID LIKE @param${paramIndex}
        OR EXISTS (
          SELECT 1 FROM Scheme_Members sm 
          WHERE sm.omer_ID = c.omer_ID 
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
    if (req.query.omer_type) {
      // Handle filter for multiple types if sent as array, or single partial match
      // Assuming simple string match for now as stored in CSV
      whereClause += ` AND c.omer_Type LIKE @param${paramIndex}`;
      params.push({ value: `%${req.query.omer_type}%`, type: sql.VarChar });
      paramIndex++;
    }

    if (req.query.has_scheme === "true") {
      whereClause += ` AND EXISTS (SELECT 1 FROM Scheme_Members sm WHERE sm.omer_ID = c.omer_ID)`;
    }

    let omersQuery = `
      ${baseQuery},
      ISNULL((SELECT COUNT(*) FROM Scheme_Members WHERE omer_ID = c.omer_ID), 0) as total_schemes,
      (SELECT STRING_AGG(cm.Name, ', ') FROM Scheme_Members sm JOIN Chit_Master cm ON sm.Scheme_ID = cm.Scheme_ID WHERE sm.omer_ID = c.omer_ID) as Assigned_Schemes,
      ISNULL((SELECT COUNT(*) FROM Payment_Master WHERE omer_ID = c.omer_ID), 0) as total_payments
      ${fromQuery}
      ${whereClause}
      ORDER BY c.omer_ID DESC
    `;

    // Only add pagination if limit is provided
    if (limit) {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      omersQuery += ` OFFSET ${offset} ROWS FETCH NEXT ${parseInt(
        limit
      )} ROWS ONLY`;
    }

    const omers = await executeQuery(omersQuery, params);

    const totalQuery = `
      SELECT COUNT(DISTINCT c.omer_ID) as total 
      ${fromQuery}
      ${whereClause}
    `;
    const totalResult = await executeQuery(totalQuery, params);

    res.json({
      omers,
      pagination: {
        totalRecords: totalResult[0]?.total || 0,
        totalPages: limit
          ? Math.ceil((totalResult[0]?.total || 0) / parseInt(limit))
          : 1,
        currentPage: parseInt(page),
        pageSize: limit ? parseInt(limit) : totalResult[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("❌ getAllomers Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch omers" });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    // Updated to select * but explicitly ensure Name is returned
    const omer = await executeQuery(
      `
      SELECT c.*, d.District_Name, s.State_Name
      FROM omer_Master c 
      LEFT JOIN District_Master d ON c.District_ID = d.District_ID 
      LEFT JOIN State_Master s ON c.State_ID = s.State_ID
      WHERE c.omer_ID = @param0
    `,
      [{ value: id, type: sql.VarChar(50) }]
    );

    if (!omer.length) {
      return res.status(404).json({ error: "omer not found" });
    }

    res.json(omer[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createCustomer = async (req, res) => {
  const connection = await sql.connect(require("../config/database").dbConfig);
  const transaction = new sql.Transaction(connection);

  try {
    let {
      omer_ID,
      omer_Code, // Extract new Field
      Name,
      Reference_Name,
      omer_Type,
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
      sendWhatsapp, // Extract flag
    } = req.body;

    // Auto-generate omer_ID if not provided
    if (!omer_ID) {
      omer_ID = await generateomerId();
    }

    const finalAddress1 = Address1 || StreetAddress1;
    const finalAddress2 = Address2 || StreetAddress2;

    await transaction.begin();

    // 1. Insert omer
    const insertReq = new sql.Request(transaction);
    await insertReq.query(`
      INSERT INTO omer_Master (
        omer_ID, omer_Code, Name, Reference_Name, omer_Type, 
        Phone_Number, Phone_Number2, Address1, Address2, 
        Area, District_ID, State_ID, Pincode
      )
      VALUES (
        '${omer_ID}', '${omer_Code || ""}', '${Name}', '${
      Reference_Name || ""
    }', '${omer_Type || ""}', 
        ${PhoneNumber}, ${PhoneNumber2 || "NULL"}, '${finalAddress1 || ""}', '${
      finalAddress2 || ""
    }', 
        '${Area || ""}', ${District_ID || "NULL"}, ${State_ID || "NULL"}, ${
      Pincode || "NULL"
    }
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
        const fundNum = schemeItem.fundNumber || (await generateFundNumber());

        // Insert Member
        const assignReq = new sql.Request(transaction);
        await assignReq
          .input("omerId", sql.VarChar(50), omer_ID)
          .input("schemeId", sql.Int, schemeId)
          .input("fundNum", sql.VarChar(50), fundNum).query(`
                               INSERT INTO Scheme_Members (omer_ID, Scheme_ID, Fund_Number, Status, Join_date, Created_at, Updated_at) 
                               VALUES (@omerId, @schemeId, @fundNum, 'Active', GETDATE(), GETDATE(), GETDATE())
                           `);

        // Generate Dues Logic
        const schemeDetailsReq = new sql.Request(transaction);
        const schemeResult = await schemeDetailsReq
          .input("schemeId", sql.Int, schemeId)
          .query(
            "SELECT Amount_per_month, Number_of_due, Month_from FROM Chit_Master WHERE Scheme_ID = @schemeId"
          );

        const scheme = schemeResult.recordset[0];
        if (scheme) {
          for (let i = 1; i <= scheme.Number_of_due; i++) {
            const dueDate = new Date(scheme.Month_from);
            dueDate.setMonth(dueDate.getMonth() + (i - 1));

            const insertDueReq = new sql.Request(transaction);
            await insertDueReq
              .input("schemeId", sql.Int, schemeId)
              .input("omerId", sql.VarChar(50), omer_ID)
              .input("fundNum", sql.VarChar(50), fundNum)
              .input("dueNumber", sql.Int, i)
              .input("dueDate", sql.Date, dueDate)
              .input("dueAmount", sql.Decimal(15, 2), scheme.Amount_per_month)
              .query(`
                                          INSERT INTO Scheme_Due (Scheme_ID, omer_ID, Fund_Number, Due_number, Due_date, Due_amount)
                                          VALUES (@schemeId, @omerId, @fundNum, @dueNumber, @dueDate, @dueAmount)
                                      `);
          }
        }
      }
    }

    await transaction.commit();

    // 📱 Send WhatsApp Notification (User Created) - Async, don't block response
    // Template Params: ["omer Name"]
    if (PhoneNumber && sendWhatsapp !== false) {
      sendWhatsappMessage(
        String(PhoneNumber),
        "welcomecccc",
        [String(omer_ID), Name],
        Name
      ).catch((err) =>
        console.error("WA Send Failed (Create omer):", err.message)
      );
    }

    res.status(201).json({
      success: true,
      omerId: omer_ID,
      message: "omer created successfully",
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
      omer_Code, // Update Code
      Name,
      Reference_Name,
      omer_Type,
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
    } = req.body;

    const finalAddress1 = Address1 || StreetAddress1;
    const finalAddress2 = Address2 || StreetAddress2;

    await executeUpdate(
      `
      UPDATE omer_Master SET 
        omer_Code = @param12,
        Name = @param1, Reference_Name = @param2, omer_Type = @param3, 
        Phone_Number = @param4, Phone_Number2 = @param5, 
        Address1 = @param6, Address2 = @param7,
        Area = @param8, District_ID = @param9, State_ID = @param10,
        Pincode = @param11
      WHERE omer_ID = @param0
    `,
      [
        { value: id, type: sql.VarChar(50) },
        { value: Name, type: sql.VarChar },
        { value: Reference_Name, type: sql.VarChar },
        { value: omer_Type, type: sql.VarChar },
        { value: PhoneNumber, type: sql.BigInt },
        { value: PhoneNumber2, type: sql.BigInt },
        { value: finalAddress1, type: sql.VarChar },
        { value: finalAddress2, type: sql.VarChar },
        { value: Area, type: sql.VarChar },
        { value: District_ID || null, type: sql.Int },
        { value: State_ID || null, type: sql.Int },
        { value: Pincode, type: sql.Int },
        { value: omer_Code, type: sql.VarChar },
      ]
    );

    res.json({ success: true, message: "omer updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  const connection = await sql.connect(require("../config/database").dbConfig);
  const transaction = new sql.Transaction(connection);

  try {
    const { id } = req.params;
    await transaction.begin();

    const request = new sql.Request(transaction);

    // 0. Delete Auction Participation/Wins
    // Found via sys.foreign_keys: Auctions references omer_Master
    const req0 = new sql.Request(transaction);
    await req0
      .input("omerId", sql.VarChar(50), id)
      .query("DELETE FROM Auctions WHERE omer_ID = @omerId");

    // 1. Delete Payments
    await request
      .input("omerId", sql.VarChar(50), id)
      .query("DELETE FROM Payment_Master WHERE omer_ID = @omerId");

    // 2. Delete Scheme Dues
    const req2 = new sql.Request(transaction);
    await req2
      .input("omerId", sql.VarChar(50), id)
      .query("DELETE FROM Scheme_Due WHERE omer_ID = @omerId");

    // 3. Delete Scheme Memberships
    const req3 = new sql.Request(transaction);
    await req3
      .input("omerId", sql.VarChar(50), id)
      .query("DELETE FROM Scheme_Members WHERE omer_ID = @omerId");

    // 4. Delete omer
    const req4 = new sql.Request(transaction);
    await req4
      .input("omerId", sql.VarChar(50), id)
      .query("DELETE FROM omer_Master WHERE omer_ID = @omerId");

    await transaction.commit();
    res.json({
      success: true,
      message: "omer and all related data deleted successfully",
    });
  } catch (error) {
    if (transaction.active) await transaction.rollback();
    console.error("❌ deleteomer Error:", error);
    res.status(500).json({ error: error.message });
  }
};

const checkCustomerId = async (req, res) => {
  try {
    const { id } = req.params;
    const omer = await executeQuery(
      "SELECT omer_ID FROM omer_Master WHERE omer_ID = @param0",
      [{ value: id, type: sql.VarChar(50) }]
    );
    res.json({ exists: omer.length > 0 });
  } catch (error) {
    console.error("❌ checkomerId Error:", error);
    res.status(500).json({ error: error.message });
  }
};

const downloadCustomers = async (req, res) => {
  try {
    const { search = "", omer_type, fund_number } = req.query;

    let baseSelect = `
            SELECT c.omer_ID, c.Name, c.Reference_Name, c.omer_Type, 
                   c.Phone_Number, c.Address1, c.Area, c.Pincode,
                   ISNULL(d.District_Name, 'N/A') as District_Name, 
                   ISNULL(s.State_Name, 'N/A') as State_Name
        `;

    let fromQuery = `
            FROM omer_Master c 
            LEFT JOIN District_Master d ON c.District_ID = d.District_ID 
            LEFT JOIN State_Master s ON c.State_ID = s.State_ID
        `;

    if (fund_number) {
      fromQuery += ` INNER JOIN Scheme_Members sm ON c.omer_ID = sm.omer_ID`;
    }

    let whereClause = "WHERE 1=1";
    const params = [];
    let paramIndex = 0;

    if (search) {
      whereClause += ` AND (c.Name LIKE @param${paramIndex} OR CAST(c.Phone_Number AS VARCHAR(20)) LIKE @param${paramIndex})`;
      params.push({ value: `%${search}%`, type: sql.VarChar });
      paramIndex++;
    }
    if (omer_type) {
      whereClause += ` AND c.omer_Type LIKE @param${paramIndex}`;
      params.push({ value: `%${omer_type}%`, type: sql.VarChar });
      paramIndex++;
    }
    if (fund_number) {
      whereClause += ` AND sm.Fund_Number LIKE @param${paramIndex}`;
      params.push({ value: `%${fund_number}%`, type: sql.VarChar });
      paramIndex++;
    }

    const query = `${baseSelect} ${fromQuery} ${whereClause} ORDER BY c.omer_ID DESC`;

    const omers = await executeQuery(query, params);
    const csvData = convertToCsv(omers);

    res.header("Content-Type", "text/csv");
    res.attachment(`omers_${Date.now()}.csv`);
    res.send(csvData);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: error.message });
  }
};

const uploadCustomers = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  // Determine file type (CSV or Excel) and parse accordingly
  const ext = path.extname(req.file.originalname).toLowerCase();
  let rows = [];
  if (ext === ".xlsx" || ext === ".xls") {
    // Use Excel parser utility
    rows = parseExcel(req.file.buffer);
  } else {
    // Assume CSV
    const csvData = req.file.buffer.toString("utf-8");
    rows = csvData.split("\n").slice(1);
  }

  const transaction = new sql.Transaction();
  try {
    await transaction.begin();
    let successCount = 0;

    for (const row of rows) {
      if (!row) continue;
      // Support both CSV (comma‑separated) and Excel (array) formats
      const values = Array.isArray(row) ? row : row.split(",");
      const [
        omer_ID,
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
      ] = values;
      const name = `${FirstName} ${LastName}`;

      const request = new sql.Request(transaction);
      await request.query(`
                INSERT INTO omer_Master (omer_ID, First_Name, Last_Name, Phone_Number, Phone_Number2, Address1, Address2, Area, District_ID, State_ID, Pincode, Nationality)
                VALUES (${omer_ID}, '${FirstName}', '${LastName}', ${PhoneNumber}, ${PhoneNumber2}, '${StreetAddress1}', '${StreetAddress2}', '${Area}', ${District_ID}, ${State_ID}, ${Pincode}, '${Nationality}')
            `);
      successCount++;
    }

    await transaction.commit();
    res.json({
      success: true,
      message: `${successCount} omers uploaded successfully.`,
    });
  } catch (error) {
    await transaction.rollback();
    res
      .status(500)
      .json({ error: "Bulk upload failed.", details: error.message });
  }
};

const getCustomerByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await executeQuery(
      `
            SELECT * FROM omer_Master WHERE omer_Code = @param0 OR omer_ID = @param0
        `,
      [{ value: code, type: sql.VarChar(50) }]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: "omer Code not found" });
    }

    res.json(result[0]);
  } catch (error) {
    console.error("❌ getomerByCode Error:", error);
    res.status(500).json({ error: error.message });
  }
};

const getCustomerByFundNumber = async (req, res) => {
  try {
    const { fundNumber } = req.params;
    const result = await executeQuery(
      `
            SELECT 
                c.omer_ID, 
                c.Name, 
                c.Phone_Number,
                sm.Scheme_ID, 
                sm.Fund_Number, 
                cm.Name as Scheme_Name
            FROM Scheme_Members sm
            JOIN omer_Master c ON sm.omer_ID = c.omer_ID
            JOIN Chit_Master cm ON sm.Scheme_ID = cm.Scheme_ID
            WHERE sm.Fund_Number = @param0
        `,
      [{ value: fundNumber, type: sql.VarChar(50) }]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: "Fund Number not found" });
    }

    res.json(result[0]);
  } catch (error) {
    console.error("❌ getomerByFundNumber Error:", error);
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
       WHERE sm.omer_ID = @param0`,
      [{ value: id, type: sql.VarChar(50) }]
    );
    res.json(schemes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const assignSchemes = async (req, res) => {
  const connection = await sql.connect(require("../config/database").dbConfig);
  const transaction = new sql.Transaction(connection);

  try {
    const { id } = req.params;
    const { schemeIds, fundNumber, sendWhatsapp } = req.body; // Array of Scheme_IDs, Optional single fundNumber, sendWhatsapp flag

    await transaction.begin();
    const request = new sql.Request(transaction);

    // Fetch Phone Number for WA
    const omerReq = new sql.Request(transaction);
    const omerRes = await omerReq
      .input("cid", sql.VarChar(50), id)
      .query("SELECT Phone_Number, Name FROM omer_Master WHERE omer_ID = @cid");
    const omer = omerRes.recordset[0];

    // 1. Delete existing assignments
    await request
      .input("omerId", sql.VarChar(50), id)
      .query("DELETE FROM Scheme_Members WHERE omer_ID = @omerId");

    // 2. Delete existing dues
    const deleteDuesReq = new sql.Request(transaction);
    await deleteDuesReq
      .input("omerId", sql.VarChar(50), id)
      .query("DELETE FROM Scheme_Due WHERE omer_ID = @omerId");

    // 3. Insert new assignments and generate dues
    let assignedSchemesList = [];
    if (schemeIds && schemeIds.length > 0) {
      for (const schemeId of schemeIds) {
        const fundNum = fundNumber || generateFundNumber(); // Use provided or generate

        // Insert Member
        const insertMemberReq = new sql.Request(transaction);
        await insertMemberReq
          .input("omerId", sql.VarChar(50), id)
          .input("schemeId", sql.Int, schemeId)
          .input("fundNum", sql.VarChar(50), fundNum)
          .query(
            "INSERT INTO Scheme_Members (omer_ID, Scheme_ID, Fund_Number) VALUES (@omerId, @schemeId, @fundNum)"
          );

        assignedSchemesList.push(fundNum);

        // Fetch Scheme Details for Dues
        const schemeDetailsReq = new sql.Request(transaction);
        const schemeResult = await schemeDetailsReq
          .input("schemeId", sql.Int, schemeId)
          .query(
            "SELECT Name, Amount_per_month, Number_of_due, Month_from FROM Chit_Master WHERE Scheme_ID = @schemeId"
          );

        const scheme = schemeResult.recordset[0];
        if (scheme) {
          for (let i = 1; i <= scheme.Number_of_due; i++) {
            const dueDate = new Date(scheme.Month_from);
            dueDate.setMonth(dueDate.getMonth() + (i - 1));

            const insertDueReq = new sql.Request(transaction);
            await insertDueReq
              .input("schemeId", sql.Int, schemeId)
              .input("omerId", sql.VarChar(50), id)
              .input("fundNum", sql.VarChar(50), fundNum)
              .input("dueNumber", sql.Int, i)
              .input("dueDate", sql.Date, dueDate)
              .input("dueAmount", sql.Decimal(15, 2), scheme.Amount_per_month)
              .query(`
                                      INSERT INTO Scheme_Due (Scheme_ID, omer_ID, Fund_Number, Due_number, Due_date, Due_amount)
                                      VALUES (@schemeId, @omerId, @fundNum, @dueNumber, @dueDate, @dueAmount)
                                  `);
          }
        }
      }
    }

    await transaction.commit();

    // 📱 Send WhatsApp Notification (Scheme Assigned)
    if (
      omer &&
      omer.Phone_Number &&
      assignedSchemesList.length > 0 &&
      sendWhatsapp !== false
    ) {
      // Sending one global assignment msg or per scheme? Usually one is better or just the first.
      sendWhatsappMessage(
        String(omer.Phone_Number),
        "welcomecccc",
        [id, "Scheme Assigned: " + assignedSchemesList.join(", ")],
        omer.Name
      ).catch((err) =>
        console.error("WA Send Failed (Assign Scheme):", err.message)
      );
    }

    res.json({
      success: true,
      message: "Schemes assigned and dues generated successfully",
    });
  } catch (error) {
    if (transaction.active) await transaction.rollback();
    console.error("❌ assignSchemes Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await connection.close();
  }
};

// Export omers to CSV
const exportCustomers = async (req, res) => {
  try {
    const { search = "", state, district, scheme_id } = req.query;

    let query = `
      SELECT c.omer_ID, c.omer_Code, c.Name, c.Reference_Name, c.omer_Type, 
             c.Phone_Number, c.Area, c.Pincode, c.Address1, c.Address2,
             ISNULL(d.District_Name, 'N/A') as District_Name, 
             ISNULL(s.State_Name, 'N/A') as State_Name
      FROM omer_Master c 
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
        OR c.omer_Code LIKE @param${paramIndex}
        OR c.omer_ID LIKE @param${paramIndex}
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

    const omers = await executeQuery(query, params);

    // Convert to CSV
    const csv = convertToCsv(omers);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=omers.csv");
    res.send(csv);
  } catch (error) {
    console.error("exportomers error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Bulk create omers from Excel upload
const bulkCreateCustomers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ error: "No data found in file" });
    }

    const connection = await sql.connect(
      require("../config/database").dbConfig
    );
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        // Auto-generate omer_ID if not provided
        let omerId = row["omer ID"] || row["omer_ID"];
        if (!omerId) {
          omerId = await generateomerId();
        }

        const phoneNumber = row["Phone Number"] || row["Phone_Number"];
        const name = row["Name"] || "";
        const omerCode = row["omer Code"] || row["omer_Code"] || "";
        const referenceName =
          row["Reference Name"] || row["Reference_Name"] || "";
        const omerType = row["omer Type"] || row["omer_Type"] || "";

        if (!phoneNumber) {
          results.errors.push(`Row ${i + 2}: Phone Number is required`);
          results.failed++;
          continue;
        }

        // Insert omer
        await executeQuery(
          `
          INSERT INTO omer_Master (
            omer_ID, omer_Code, Name, Reference_Name, omer_Type, 
            Phone_Number, Phone_Number2, Address1, Address2, 
            Area, District_ID, State_ID, Pincode
          )
          VALUES (
            @param0, @param1, @param2, @param3, @param4, 
            @param5, NULL, '', '', 
            '', NULL, NULL, NULL
          )
        `,
          [
            { value: omerId, type: sql.VarChar(50) },
            { value: omerCode, type: sql.VarChar(50) },
            { value: name, type: sql.VarChar(100) },
            { value: referenceName, type: sql.VarChar(100) },
            { value: omerType, type: sql.VarChar(50) },
            { value: phoneNumber, type: sql.VarChar(20) },
          ]
        );

        results.success++;
      } catch (error) {
        results.errors.push(`Row ${i + 2}: ${error.message}`);
        results.failed++;
      }
    }

    res.json({
      message: "Bulk upload completed",
      total: data.length,
      success: results.success,
      failed: results.failed,
      errors: results.errors,
    });
  } catch (error) {
    console.error("bulkCreateomers error:", error);
    res.status(500).json({ error: error.message });
  }
};

// API endpoint to get next fund number
const getNextFundNumber = async (req, res) => {
  try {
    const fundNumber = await generateFundNumber();
    res.json({ fundNumber });
  } catch (error) {
    console.error("getNextFundNumber error:", error);
    res.status(500).json({ error: error.message });
  }
};

// API endpoint to get next omer ID
const getNextCustomerId = async (req, res) => {
  try {
    const omerId = await generateomerId();
    res.json({ omerId });
  } catch (error) {
    console.error("getNextomerId error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  assignSchemes,
  getCustomerSchemes,
  exportCustomers,
  bulkCreateCustomers,
  getNextFundNumber,
  getNextCustomerId,
  generateCustomerId,
};
