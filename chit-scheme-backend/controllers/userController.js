const bcrypt = require('bcryptjs');
const { executeQuery, executeInsert } = require('../models/db');
const mssql = require('mssql');

/**
 * Get all users (admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await executeQuery(
      'SELECT User_ID, Username, Full_Name, Role, Created_At FROM Users ORDER BY Created_At DESC'
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create new user (admin only)
 */
const createUser = async (req, res) => {
  try {
    const { username, password, fullName, role } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Validate role
    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
    }

    // Check if username already exists
    const existingUsers = await executeQuery(
      'SELECT User_ID FROM Users WHERE Username = @username',
      [{ name: 'username', value: username, type: mssql.VarChar }]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    // Insert new user - let database handle Created_At with default
    await executeQuery(
      `INSERT INTO Users (Username, Password_Hash, Full_Name, Role) 
       VALUES (@username, @passwordHash, @fullName, @role)`,
      [
        { name: 'username', value: username, type: mssql.VarChar },
        { name: 'passwordHash', value: passwordHash, type: mssql.VarChar },
        { name: 'fullName', value: fullName || null, type: mssql.VarChar },
        { name: 'role', value: role || 'user', type: mssql.VarChar }
      ]
    );

    res.status(201).json({
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update user (admin only)
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, fullName, role } = req.body;

    // Validate role if provided
    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
    }

    // Check if user exists
    const existingUsers = await executeQuery(
      'SELECT User_ID FROM Users WHERE User_ID = @id',
      [{ name: 'id', value: id, type: mssql.Int }]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build dynamic update query
    const updates = [];
    const params = [];

    if (username) {
      updates.push('Username = @username');
      params.push({ name: 'username', value: username, type: mssql.VarChar });
    }

    if (password) {
      const passwordHash = bcrypt.hashSync(password, 10);
      updates.push('Password_Hash = @passwordHash');
      params.push({ name: 'passwordHash', value: passwordHash, type: mssql.VarChar });
    }

    if (fullName !== undefined) {
      updates.push('Full_Name = @fullName');
      params.push({ name: 'fullName', value: fullName, type: mssql.VarChar });
    }

    if (role) {
      updates.push('Role = @role');
      params.push({ name: 'role', value: role, type: mssql.VarChar });
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push({ name: 'id', value: id, type: mssql.Int });

    await executeQuery(
      `UPDATE Users SET ${updates.join(', ')} WHERE User_ID = @id`,
      params
    );

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete user (admin only)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists
    const existingUsers = await executeQuery(
      'SELECT User_ID FROM Users WHERE User_ID = @id',
      [{ name: 'id', value: id, type: mssql.Int }]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await executeQuery(
      'DELETE FROM Users WHERE User_ID = @id',
      [{ name: 'id', value: id, type: mssql.Int }]
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
};
