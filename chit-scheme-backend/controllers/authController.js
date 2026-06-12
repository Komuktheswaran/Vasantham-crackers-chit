
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { executeQuery, executeInsert } = require('../models/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const users = await executeQuery(
      'SELECT User_ID, Username, Password_Hash, Full_Name, Role FROM Users WHERE Username = @username',
      [{ name: 'username', value: username, type: require('mssql').VarChar }]
    );

    const user = users[0];

    if (!user) {
      // Constant-time hash to avoid leaking account existence via timing
      await bcrypt.compare(password || '', '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalu');
      return sendError(res, 'Invalid credentials', null, 401);
    }

    const isMatch = await bcrypt.compare(password, user.Password_Hash);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', null, 401);
    }
    
    const token = jwt.sign(
      { id: user.User_ID, username: user.Username, role: user.Role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '8h' } // Reduced token validity for better security
    );
    
    return sendSuccess(res, 'Login successful', {
      token,
      user: { id: user.User_ID, username: user.Username, name: user.Full_Name, role: user.Role }
    });
  } catch (error) {
    return sendError(res, 'Login failed', error);
  }
};

module.exports = { login };
