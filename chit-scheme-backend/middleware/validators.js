const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const customerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 3 }).withMessage('Name must be at least 3 characters').escape(),
  body('phone').trim().notEmpty().withMessage('Phone number is required').isMobilePhone().withMessage('Invalid phone number'),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('address').optional().trim().escape(),
  body('place').optional().trim().escape(),
  body('state_id').optional().isInt().withMessage('State ID must be an integer'),
  body('district_id').optional().isInt().withMessage('District ID must be an integer'),
  body('pincode').optional().trim().isPostalCode('IN').withMessage('Invalid Pincode'),
  validate
];

const schemeValidation = [
  body('name').trim().notEmpty().withMessage('Scheme Name is required').escape(),
  body('total_amount').isFloat({ min: 0 }).withMessage('Total Amount must be a positive number'),
  body('amount_per_month').isFloat({ min: 0 }).withMessage('Amount per month must be a positive number'),
  body('number_of_due').isInt({ min: 1 }).withMessage('Number of dues must be at least 1'),
  body('period').optional().trim().escape(),
  body('month_from').optional().trim(),
  body('month_to').optional().trim(),
  validate
];

const paymentValidation = [
  body('Customer_ID').trim().notEmpty().withMessage('Customer ID is required'),
  body('Scheme_ID').isInt().withMessage('Scheme ID must be an integer'),
  body('Amount_Received').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('Transaction_ID').optional().trim().escape(),
  body('Payment_Date').optional().isISO8601().withMessage('Invalid Date format'),
  validate
];

module.exports = {
  customerValidation,
  schemeValidation,
  paymentValidation
};
