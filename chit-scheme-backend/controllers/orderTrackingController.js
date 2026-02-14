const { executeQuery, executeInsertGetId, executeUpdate } = require('../models/db');
const sql = require('mssql');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { sendWhatsappMessage } = require('../services/whatsappService');

const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT ot.*, c.Name as Customer_Name, c.Phone_Number
      FROM Order_Tracking ot
      LEFT JOIN Customer_Master c ON ot.Customer_ID = c.Customer_ID
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 0;

    if (search) {
      query += ` AND (
        ot.Tracking_Number LIKE @param${paramIndex} OR 
        ot.Order_Number LIKE @param${paramIndex} OR 
        ot.Fund_Number LIKE @param${paramIndex} OR
        c.Name LIKE @param${paramIndex} OR
        c.Phone_Number LIKE @param${paramIndex}
      )`;
      params.push({ value: `%${search}%`, type: sql.VarChar });
      paramIndex++;
    }

    // Capture total before pagination
    const countQueryStr = `SELECT COUNT(*) as total FROM Order_Tracking ot 
                           LEFT JOIN Customer_Master c ON ot.Customer_ID = c.Customer_ID
                           WHERE ` + query.split('WHERE')[1];

    query += ` ORDER BY ot.Created_At DESC OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;

    const [orders, totalResult] = await Promise.all([
      executeQuery(query, params),
      executeQuery(countQueryStr, params)
    ]);

    return sendSuccess(res, 'Orders fetched successfully', {
      orders,
      pagination: {
        totalRecords: totalResult[0]?.total || 0,
        currentPage: parseInt(page),
        pageSize: parseInt(limit)
      }
    });
  } catch (error) {
    return sendError(res, 'Failed to fetch orders', error);
  }
};

const createOrder = async (req, res) => {
  try {
    const { 
      Tracking_Number, Order_Number, Customer_ID, Fund_Number, 
      Order_Received_Date, Payment_Received_Date, Payment_Amount,
      Transporter_Name, Transporter_Contact, Source,
      Packing_Status, Parcel_Quantity, // New fields
      sendWhatsapp = true
    } = req.body;

    await executeInsertGetId(
      `INSERT INTO Order_Tracking (
        Tracking_Number, Order_Number, Customer_ID, Fund_Number, 
        Order_Received_Date, Payment_Received_Date, Payment_Amount,
        Transporter_Name, Transporter_Contact, Source,
        Packing_Status, Parcel_Quantity
      ) VALUES (
        @param0, @param1, @param2, @param3, @param4, @param5, @param6, @param7, @param8, @param9, @param10, @param11
      )`,
      [
        { value: Tracking_Number, type: sql.VarChar(100) },
        { value: Order_Number, type: sql.VarChar(100) },
        { value: Customer_ID, type: sql.VarChar(50) },
        { value: Fund_Number, type: sql.VarChar(50) },
        { value: Order_Received_Date ? new Date(Order_Received_Date) : null, type: sql.Date },
        { value: Payment_Received_Date ? new Date(Payment_Received_Date) : null, type: sql.Date },
        { value: Payment_Amount ? parseFloat(Payment_Amount) : null, type: sql.Decimal(18, 2) },
        { value: Transporter_Name, type: sql.VarChar(100) },
        { value: Transporter_Contact, type: sql.VarChar(50) },
        { value: Source, type: sql.VarChar(50) },
        { value: Packing_Status || 'Pending', type: sql.VarChar(50) },
        { value: Parcel_Quantity ? parseInt(Parcel_Quantity) : 0, type: sql.Int }
      ]
    );

    // 📱 Send WhatsApp Notification (Order Received)
    // We need customer phone number. If Customer_ID is present, fetch it.
    if (Customer_ID && sendWhatsapp !== false) {
         try {
             // Quick fetch for customer phone
             const customer = await executeQuery('SELECT Phone_Number, Name FROM Customer_Master WHERE Customer_ID = @param0', [{value: Customer_ID, type: sql.VarChar(50)}]);
             if (customer.length > 0 && customer[0].Phone_Number) {
                 sendWhatsappMessage(String(customer[0].Phone_Number), "welcomecccc", [Order_Number || Tracking_Number, "Order Received"], customer[0].Name)
                    .catch(err => console.error("WA Send Failed (Order Create):", err.message));
             }
         } catch (err) {
             console.error("Failed to fetch customer for WA:", err.message);
         }
    }

    return sendSuccess(res, 'Order created successfully', null, 201);
  } catch (error) {
    return sendError(res, 'Failed to create order', error);
  }
};

const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      Tracking_Number, Order_Number, Customer_ID, Fund_Number, 
      Order_Received_Date, Payment_Received_Date, Payment_Amount,
      Transporter_Name, Transporter_Contact, Source,
      Packing_Status, Parcel_Quantity,
      sendWhatsapp = true
    } = req.body;

    // Check if Transporter details are added to trigger "Order Sent"
    // Fetch previous state to compare? Or just check if field is present and non-empty.
    // Ideally we should check if they CHANGED from null to value, but checking presence is a decent proxy for "Adding shipping info"
    let isShippingUpdate = false;
    if (Transporter_Name && Transporter_Name.trim() !== '') {
        isShippingUpdate = true;
    }

    await executeUpdate(
      `UPDATE Order_Tracking SET
        Tracking_Number=@param1, Order_Number=@param2, Customer_ID=@param3, Fund_Number=@param4, 
        Order_Received_Date=@param5, Payment_Received_Date=@param6, Payment_Amount=@param7,
        Transporter_Name=@param8, Transporter_Contact=@param9, Source=@param10,
        Packing_Status=@param11, Parcel_Quantity=@param12
       WHERE Tracking_ID = @param0`,
      [
        { value: parseInt(id), type: sql.Int },
        { value: Tracking_Number, type: sql.VarChar(100) },
        { value: Order_Number, type: sql.VarChar(100) },
        { value: Customer_ID, type: sql.VarChar(50) },
        { value: Fund_Number, type: sql.VarChar(50) },
        { value: Order_Received_Date ? new Date(Order_Received_Date) : null, type: sql.Date },
        { value: Payment_Received_Date ? new Date(Payment_Received_Date) : null, type: sql.Date },
        { value: Payment_Amount ? parseFloat(Payment_Amount) : null, type: sql.Decimal(18, 2) },
        { value: Transporter_Name, type: sql.VarChar(100) },
        { value: Transporter_Contact, type: sql.VarChar(50) },
        { value: Source, type: sql.VarChar(50) },
        { value: Packing_Status || 'Pending', type: sql.VarChar(50) },
        { value: Parcel_Quantity ? parseInt(Parcel_Quantity) : 0, type: sql.Int }
      ]
    );

    // 📱 Send WhatsApp Notification (Order Sent / Packaging)
    if (isShippingUpdate && Customer_ID && sendWhatsapp !== false) {
         try {
             // Quick fetch for customer phone
             const customer = await executeQuery('SELECT Phone_Number, Name FROM Customer_Master WHERE Customer_ID = @param0', [{value: Customer_ID, type: sql.VarChar(50)}]);
             if (customer.length > 0 && customer[0].Phone_Number) {
                 const msg = `Order Dispatched via ${Transporter_Name}. Tracking: ${Tracking_Number}`;
                 sendWhatsappMessage(String(customer[0].Phone_Number), "welcomecccc", [Order_Number || 'Order', msg], customer[0].Name)
                    .catch(err => console.error("WA Send Failed (Order Update):", err.message));
             }
         } catch (err) {
             console.error("Failed to fetch customer for WA:", err.message);
         }
    }

    return sendSuccess(res, 'Order updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update order', error);
  }
};

const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await executeUpdate(
      'DELETE FROM Order_Tracking WHERE Tracking_ID = @param0',
      [{ value: parseInt(id), type: sql.Int }]
    );
    return sendSuccess(res, 'Order deleted successfully');
  } catch (error) {
    return sendError(res, 'Failed to delete order', error);
  }
};

module.exports = {
  getAllOrders,
  createOrder,
  updateOrder,
  deleteOrder
};
