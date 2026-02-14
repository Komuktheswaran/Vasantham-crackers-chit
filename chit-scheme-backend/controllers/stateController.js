const { executeQuery } = require('../models/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const getAllStates = async (req, res) => {
  try {
    const states = await executeQuery('SELECT * FROM State_Master');
    return sendSuccess(res, 'States fetched successfully', states);
  } catch (error) {
    return sendError(res, 'Failed to fetch states', error);
  }
};

module.exports = {
  getAllStates,
};
