const { executeQuery } = require('../models/db');

const getAllDistricts = async (req, res) => {
  try {
    const districts = await executeQuery('SELECT * FROM District_Master');
    res.json(districts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllDistricts,
};
