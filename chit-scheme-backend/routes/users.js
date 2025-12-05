const express = require('express');
const { getAllUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/adminAuth');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Validation middleware for user creation
const validateUserCreation = [
  body('username').trim().notEmpty().withMessage('Username is required').isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters').escape(),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').optional().trim().isLength({ max: 100 }).withMessage('Full name must not exceed 100 characters').escape(),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role must be either "admin" or "user"'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Validation middleware for user update
const validateUserUpdate = [
  body('username').optional().trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters').escape(),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').optional().trim().isLength({ max: 100 }).withMessage('Full name must not exceed 100 characters').escape(),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role must be either "admin" or "user"'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// All routes require authentication and admin role
router.get('/', authenticateToken, requireAdmin, getAllUsers);
router.post('/', authenticateToken, requireAdmin, validateUserCreation, createUser);
router.put('/:id', authenticateToken, requireAdmin, validateUserUpdate, updateUser);
router.delete('/:id', authenticateToken, requireAdmin, deleteUser);

module.exports = router;
