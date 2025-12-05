 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { executeQuery, executeInsert } = require('../models/db');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Query user from database
    const users = await executeQuery(
      'SELECT User_ID, Username, Password_Hash, Full_Name, Role FROM Users WHERE Username = @username',
      [{ name: 'username', value: username, type: require('mssql').VarChar }]
    );
    
    const user = users[0];
    
    if (!user || !bcrypt.compareSync(password, user.Password_Hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.User_ID, username: user.Username, role: user.Role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '8h' } // Reduced token validity for better security
    );
    
    res.json({
      token,
      user: { id: user.User_ID, username: user.Username, name: user.Full_Name, role: user.Role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { login };
