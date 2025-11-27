const { executeQuery } = require('../models/db');

const getAllStates = async (req, res) => {
  try {
    const states = await executeQuery('SELECT * FROM State_Master');
    res.json(states);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllStates,
};
