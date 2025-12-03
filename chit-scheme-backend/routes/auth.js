const express = require('express');
const { login } = require('../controllers/authController');
const router = express.Router();

const { body, validationResult } = require('express-validator');

const validateLogin = [
  body('username').trim().notEmpty().withMessage('Username is required').escape(),
  body('password').notEmpty().withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

router.post('/login', validateLogin, login);

module.exports = router;
