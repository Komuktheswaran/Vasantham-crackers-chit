
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { executeQuery, executeInsert } = require('../models/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login Request Body:', req.body);
    
    // Query user from database
    const users = await executeQuery(
      'SELECT User_ID, Username, Password_Hash, Full_Name, Role FROM Users WHERE Username = @username',
      [{ name: 'username', value: username, type: require('mssql').VarChar }]
    );
    
    const user = users[0];
    
    if (!user) {
      console.log(`Login failed: User '${username}' not found`);
      return sendError(res, 'Invalid credentials', null, 401);
    }

    const isMatch = bcrypt.compareSync(password, user.Password_Hash);
    if (!isMatch) {
      console.log(`Login failed: Password mismatch for user '${username}'`);
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
