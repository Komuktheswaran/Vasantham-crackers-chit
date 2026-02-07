const { executeQuery, executeInsertGetId, executeUpdate } = require('../models/db');
const sql = require('mssql');

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

    res.json(transporters);
  } catch (error) {
    console.error('getAllTransporters error:', error);
    res.status(500).json({ error: error.message });
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
      return res.status(404).json({ error: 'Transporter not found' });
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

    res.json(transporter[0]);
  } catch (error) {
    console.error('getTransporterById error:', error);
    res.status(500).json({ error: error.message });
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
      { value: Phone_Number, type: sql.VarChar(50) }
    ]);

    res.status(201).json({ 
      success: true, 
      transporterId,
      message: 'Transporter created successfully' 
    });
  } catch (error) {
    console.error('createTransporter error:', error);
    res.status(500).json({ error: error.message });
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

    res.json({ success: true, message: 'Transporter updated successfully' });
  } catch (error) {
    console.error('updateTransporter error:', error);
    res.status(500).json({ error: error.message });
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

    res.json({ success: true, message: 'Transporter deleted successfully' });
  } catch (error) {
    console.error('deleteTransporter error:', error);
    res.status(500).json({ error: error.message });
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

    res.json(deliveryPoints);
  } catch (error) {
    console.error('getDeliveryPoints error:', error);
    res.status(500).json({ error: error.message });
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

    res.status(201).json({ 
      success: true, 
      deliveryPointId,
      message: 'Delivery point added successfully' 
    });
  } catch (error) {
    console.error('addDeliveryPoint error:', error);
    res.status(500).json({ error: error.message });
  }
};

const deleteDeliveryPoint = async (req, res) => {
  try {
    const { pointId } = req.params;

    await executeUpdate(`
      DELETE FROM Delivery_Points WHERE Delivery_Point_ID = @param0
    `, [{ value: parseInt(pointId), type: sql.Int }]);

    res.json({ success: true, message: 'Delivery point deleted successfully' });
  } catch (error) {
    console.error('deleteDeliveryPoint error:', error);
    res.status(500).json({ error: error.message });
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

    res.json(deliveryPoints);
  } catch (error) {
    console.error('getAllDeliveryPoints error:', error);
    res.status(500).json({ error: error.message });
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
  deleteDeliveryPoint,
  getAllDeliveryPoints
};
