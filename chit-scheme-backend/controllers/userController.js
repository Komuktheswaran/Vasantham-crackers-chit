const bcrypt = require('bcryptjs');
const { executeQuery, executeInsert } = require('../models/db');
const mssql = require('mssql');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * Get all users (admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await executeQuery(
      'SELECT User_ID, Username, Full_Name, Role, Created_At FROM Users ORDER BY Created_At DESC'
    );
    return sendSuccess(res, 'Users fetched successfully', users);
  } catch (error) {
    return sendError(res, 'Failed to fetch users', error);
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
      return sendError(res, 'Username and password are required', null, 400);
    }

    // Validate role
    if (role && !['Admin', 'Staff'].includes(role)) {
      return sendError(res, 'Invalid role. Must be "Admin" or "Staff"', null, 400);
    }

    // Check if username already exists
    const existingUsers = await executeQuery(
      'SELECT User_ID FROM Users WHERE Username = @username',
      [{ name: 'username', value: username, type: mssql.VarChar }]
    );

    if (existingUsers.length > 0) {
      return sendError(res, 'Username already exists', null, 400);
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
        { name: 'role', value: role || 'Staff', type: mssql.VarChar }
      ]
    );

    return sendSuccess(res, 'User created successfully', null, 201);
  } catch (error) {
    return sendError(res, 'Failed to create user', error);
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
    if (role && !['Admin', 'Staff'].includes(role)) {
      return sendError(res, 'Invalid role. Must be "Admin" or "Staff"', null, 400);
    }

    // Check if user exists
    const existingUsers = await executeQuery(
      'SELECT User_ID FROM Users WHERE User_ID = @id',
      [{ name: 'id', value: id, type: mssql.Int }]
    );

    if (existingUsers.length === 0) {
      return sendError(res, 'User not found', null, 404);
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
      return sendError(res, 'No fields to update', null, 400);
    }

    params.push({ name: 'id', value: id, type: mssql.Int });

    await executeQuery(
      `UPDATE Users SET ${updates.join(', ')} WHERE User_ID = @id`,
      params
    );

    return sendSuccess(res, 'User updated successfully');
  } catch (error) {
    return sendError(res, 'Failed to update user', error);
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
      return sendError(res, 'Cannot delete your own account', null, 400);
    }

    // Check if user exists
    const existingUsers = await executeQuery(
      'SELECT User_ID FROM Users WHERE User_ID = @id',
      [{ name: 'id', value: id, type: mssql.Int }]
    );

    if (existingUsers.length === 0) {
      return sendError(res, 'User not found', null, 404);
    }

    await executeQuery(
      'DELETE FROM Users WHERE User_ID = @id',
      [{ name: 'id', value: id, type: mssql.Int }]
    );

    return sendSuccess(res, 'User deleted successfully');
  } catch (error) {
    return sendError(res, 'Failed to delete user', error);
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
};
