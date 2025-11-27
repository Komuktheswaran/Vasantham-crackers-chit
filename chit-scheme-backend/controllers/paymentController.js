 
const { executeQuery, executeInsert } = require('../models/db');

const getPaymentsByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const result = await executeQuery(`
      SELECT p.*, cm.Name as scheme_name
      FROM Payment_Master p
      JOIN Chit_Master cm ON p.Scheme_ID = cm.Scheme_ID
      WHERE p.Customer_ID = @param0
      ORDER BY p.Due_Month DESC
    `, [{ value: parseInt(customerId), type: sql.Int }]);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const recordPayment = async (req, res) => {
  try {
    const { Scheme_ID, Customer_ID, Due_Month, Transaction_ID, Amount_Received } = req.body;
    
    const result = await executeInsert(`
      INSERT INTO Payment_Master (Scheme_ID, Customer_ID, Due_Month, Received_Flag, Transaction_ID, Amount_Received, Amount_Received_date)
      OUTPUT INSERTED.Pay_ID
      VALUES (@param0, @param1, @param2, 1, @param3, @param4, GETDATE())
    `, [
      { value: parseInt(Scheme_ID), type: sql.Int },
      { value: parseInt(Customer_ID), type: sql.Int },
      { value: Due_Month, type: sql.Date },
      { value: Transaction_ID, type: sql.VarChar(50) },
      { value: parseFloat(Amount_Received), type: sql.Decimal(15,2) }
    ]);
    
    res.status(201).json({ message: 'Payment recorded', payId: result.Pay_ID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getPaymentsByCustomer, recordPayment };
