const { executeQuery } = require('../models/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const getAllDistricts = async (req, res) => {
  try {
    const districts = await executeQuery('SELECT * FROM District_Master');
    return sendSuccess(res, 'Districts fetched successfully', districts);
  } catch (error) {
    return sendError(res, 'Failed to fetch districts', error);
  }
};

module.exports = {
  getAllDistricts,
};
