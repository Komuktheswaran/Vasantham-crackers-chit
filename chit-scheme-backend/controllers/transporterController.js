const { executeQuery, executeInsertGetId, executeUpdate } = require('../models/db');
const sql = require('mssql');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const getAllTransporters = async (req, res) => {
  try {
    // Fetch all transporters with their delivery points
    const transporters = await executeQuery(`
      SELECT 
        t.Transporter_ID,
        t.Transporter_Name,
        t.Contact_Person,
        t.Phone_Number
      FROM Transporters t
      ORDER BY t.Transporter_Name
    `);

    // For each transporter, fetch delivery points
    for (let transporter of transporters) {
      const deliveryPoints = await executeQuery(`
        SELECT 
          Delivery_Point_ID,
          Place_Name,
          Branch_Address,
          Branch_Phone,
          Transporter_ID
        FROM Delivery_Points
        WHERE Transporter_ID = @param0
        ORDER BY Place_Name
      `, [{ value: transporter.Transporter_ID, type: sql.Int }]);
      
      transporter.delivery_points = deliveryPoints;
    }

    return sendSuccess(res, 'Transporters fetched successfully', transporters);
  } catch (error) {
    return sendError(res, 'Failed to fetch transporters', error);
  }
};

const getTransporterById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transporter = await executeQuery(`
      SELECT 
        t.Transporter_ID,
        t.Transporter_Name,
        t.Contact_Person,
        t.Phone_Number
      FROM Transporters t
      WHERE t.Transporter_ID = @param0
    `, [{ value: parseInt(id), type: sql.Int }]);

    if (!transporter.length) {
      return sendError(res, 'Transporter not found', null, 404);
    }

    // Fetch delivery points
    const deliveryPoints = await executeQuery(`
      SELECT 
        Delivery_Point_ID,
        Place_Name,
        Transporter_ID
      FROM Delivery_Points
      WHERE Transporter_ID = @param0
      ORDER BY Place_Name
    `, [{ value: parseInt(id), type: sql.Int }]);

    transporter[0].delivery_points = deliveryPoints;

    return sendSuccess(res, 'Transporter details fetched successfully', transporter[0]);
  } catch (error) {
    return sendError(res, 'Failed to fetch transporter details', error);
  }
};

const createTransporter = async (req, res) => {
  try {
    const { Transporter_Name, Contact_Person, Phone_Number } = req.body;

    const transporterId = await executeInsertGetId(`
      INSERT INTO Transporters (Transporter_Name, Contact_Person, Phone_Number)
      VALUES (@param0, @param1, @param2)
    `, [
      { value: Transporter_Name, type: sql.VarChar(100) },
      { value: Contact_Person || null, type: sql.VarChar(100) },
      { value: Phone_Number || null, type: sql.VarChar(50) }
    ]);

    return sendSuccess(res, 'Transporter created successfully', { transporterId }, 201);
  } catch (error) {
    return sendError(res, 'Failed to create transporter', error);
  }
};

const updateTransporter = async (req, res) => {
  try {
    const { id } = req.params;
    const { Transporter_Name, Contact_Person, Phone_Number } = req.body;

    await executeUpdate(`
      UPDATE Transporters 
      SET Transporter_Name = @param1,
      Contact_Person = @param2,
      Phone_Number = @param3
      WHERE Transporter_ID = @param0
    `, [
      { value: parseInt(id), type: sql.Int },
      { value: Transporter_Name, type: sql.VarChar(100) },
      { value: Contact_Person || null, type: sql.VarChar(100) },
      { value: Phone_Number, type: sql.VarChar(50) }
    ]);

    return sendSuccess(res, 'Transporter updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update transporter', error);
  }
};

const deleteTransporter = async (req, res) => {
  try {
    const { id } = req.params;

    // First delete associated delivery points
    await executeUpdate(`
      DELETE FROM Delivery_Points WHERE Transporter_ID = @param0
    `, [{ value: parseInt(id), type: sql.Int }]);

    // Then delete the transporter
    await executeUpdate(`
      DELETE FROM Transporters WHERE Transporter_ID = @param0
    `, [{ value: parseInt(id), type: sql.Int }]);

    return sendSuccess(res, 'Transporter deleted successfully');
  } catch (error) {
    return sendError(res, 'Failed to delete transporter', error);
  }
};

const getDeliveryPoints = async (req, res) => {
  try {
    const { id } = req.params;

    const deliveryPoints = await executeQuery(`
      SELECT 
        Delivery_Point_ID,
        Place_Name,
        Branch_Address,
        Branch_Phone,
        Transporter_ID
      FROM Delivery_Points
      WHERE Transporter_ID = @param0
      ORDER BY Place_Name
    `, [{ value: parseInt(id), type: sql.Int }]);

    return sendSuccess(res, 'Delivery points fetched successfully', deliveryPoints);
  } catch (error) {
    return sendError(res, 'Failed to fetch delivery points', error);
  }
};

const addDeliveryPoint = async (req, res) => {
  try {
    const { id } = req.params;
    const { Place_Name, Branch_Address, Branch_Phone } = req.body;

    const deliveryPointId = await executeInsertGetId(`
      INSERT INTO Delivery_Points (Transporter_ID, Place_Name, Branch_Address, Branch_Phone)
      VALUES (@param0, @param1, @param2, @param3)
    `, [
      { value: parseInt(id), type: sql.Int },
      { value: Place_Name, type: sql.VarChar(100) },
      { value: Branch_Address || null, type: sql.VarChar(255) },
      { value: Branch_Phone || null, type: sql.VarChar(50) }
    ]);

    return sendSuccess(res, 'Delivery point added successfully', { deliveryPointId }, 201);
  } catch (error) {
    return sendError(res, 'Failed to add delivery point', error);
  }
};

const updateDeliveryPoint = async (req, res) => {
  try {
    const { pointId } = req.params;
    const { Place_Name, Branch_Address, Branch_Phone } = req.body;

    await executeUpdate(`
      UPDATE Delivery_Points
      SET Place_Name = @param1,
      Branch_Address = @param2,
      Branch_Phone = @param3
      WHERE Delivery_Point_ID = @param0
    `, [
      { value: parseInt(pointId), type: sql.Int },
      { value: Place_Name, type: sql.VarChar(100) },
      { value: Branch_Address || null, type: sql.VarChar(255) },
      { value: Branch_Phone || null, type: sql.VarChar(50) }
    ]);

    return sendSuccess(res, 'Delivery point updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update delivery point', error);
  }
};

const deleteDeliveryPoint = async (req, res) => {
  try {
    const { pointId } = req.params;

    await executeUpdate(`
      DELETE FROM Delivery_Points WHERE Delivery_Point_ID = @param0
    `, [{ value: parseInt(pointId), type: sql.Int }]);

    return sendSuccess(res, 'Delivery point deleted successfully');
  } catch (error) {
    return sendError(res, 'Failed to delete delivery point', error);
  }
};

const getAllDeliveryPoints = async (req, res) => {
  try {
    const deliveryPoints = await executeQuery(`
      SELECT 
        dp.Delivery_Point_ID,
        dp.Place_Name,
        dp.Branch_Address,
        dp.Branch_Phone,
        dp.Transporter_ID,
        t.Transporter_Name
      FROM Delivery_Points dp
      JOIN Transporters t ON dp.Transporter_ID = t.Transporter_ID
      ORDER BY t.Transporter_Name, dp.Place_Name
    `);

    return sendSuccess(res, 'All delivery points fetched successfully', deliveryPoints);
  } catch (error) {
    return sendError(res, 'Failed to fetch all delivery points', error);
  }
};

module.exports = {
  getAllTransporters,
  getTransporterById,
  createTransporter,
  updateTransporter,
  deleteTransporter,
  getDeliveryPoints,
  addDeliveryPoint,
  updateDeliveryPoint,
  deleteDeliveryPoint,
  getAllDeliveryPoints
};
