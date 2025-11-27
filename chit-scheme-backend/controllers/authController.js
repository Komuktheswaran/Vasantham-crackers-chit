 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { executeQuery, executeInsert } = require('../models/db');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Simple user validation (replace with real users table)
    const users = await executeQuery(`
      SELECT * FROM (VALUES 
        (1, 'admin', 'Admin User', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
      ) AS u(id, username, name, password)
    `);
    
    const user = users.find(u => u.username === username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { login };
