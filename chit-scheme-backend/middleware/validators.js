const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const customerValidation = [
  body('Customer_ID').trim().notEmpty().withMessage('Customer ID is required'),
  body('Name').trim().notEmpty().withMessage('Name is required').isLength({ min: 3 }).withMessage('Name must be at least 3 characters').escape(),
  body('Reference_Name').optional().trim().escape(),
  body('Customer_Type').trim().notEmpty().withMessage('Customer Type is required'),
  body('PhoneNumber').trim().notEmpty().withMessage('Phone number is required').isMobilePhone().withMessage('Invalid phone number'),
  body('Address1').optional().trim().escape(),
  body('Address2').optional().trim().escape(),
  body('StreetAddress1').optional().trim().escape(), // Backward compat or frontend mapping
  body('StreetAddress2').optional().trim().escape(),
  body('Area').optional().trim().escape(),
  body('State_ID').optional().isInt().withMessage('State ID must be an integer'),
  body('District_ID').optional().isInt().withMessage('District ID must be an integer'),
  body('Pincode').optional().trim().isPostalCode('IN').withMessage('Invalid Pincode'),
  body('Scheme_ID').optional({ checkFalsy: true }).isInt().withMessage('Scheme ID must be an integer'),
  body('Fund_Number').if(body('Scheme_ID').exists({ checkFalsy: true })).notEmpty().withMessage('Fund Number is required when assigning a scheme'),
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
  body('Payment_Mode').trim().notEmpty().withMessage('Payment Mode is required').isIn(['Cash', 'UPI', 'Bank Transfer', 'Cheque']).withMessage('Invalid Payment Mode'),
  body('UPI_Phone_Number').if(body('Payment_Mode').equals('UPI')).trim().notEmpty().withMessage('Phone Number is required for UPI payments').isMobilePhone().withMessage('Invalid Phone Number'),
  body('Transaction_ID').optional().trim().escape(),
  body('Payment_Date').optional().isISO8601().withMessage('Invalid Date format'),
  validate
];

module.exports = {
  customerValidation,
  schemeValidation,
  paymentValidation
};
