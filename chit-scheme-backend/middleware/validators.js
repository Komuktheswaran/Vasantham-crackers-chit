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
  body('Reference_Name').optional({ checkFalsy: true }).trim().escape(),
  body('Customer_Type').trim().notEmpty().withMessage('Customer Type is required'),
  body('PhoneNumber').trim().notEmpty().withMessage('Phone number is required').isMobilePhone().withMessage('Invalid phone number'),
  body('Address1').optional({ checkFalsy: true }).trim().escape(),
  body('Address2').optional({ checkFalsy: true }).trim().escape(),
  body('StreetAddress1').optional({ checkFalsy: true }).trim().escape(), 
  body('StreetAddress2').optional({ checkFalsy: true }).trim().escape(),
  body('Area').optional({ checkFalsy: true }).trim().escape(),
  body('State_ID').customSanitizer(val => val === "" ? null : val).optional({ nullable: true }).isInt().withMessage('State ID must be an integer'),
  body('District_ID').customSanitizer(val => val === "" ? null : val).optional({ nullable: true }).isInt().withMessage('District ID must be an integer'),
  body('Pincode').customSanitizer(val => val === "" ? null : val).optional({ nullable: true }).trim().isPostalCode('IN').withMessage('Invalid Pincode'),
  body('Scheme_ID').customSanitizer(val => val === "" ? null : val).optional({ nullable: true }).isInt().withMessage('Scheme ID must be an integer'),
  body('Fund_Number').if(body('Scheme_ID').exists({ checkFalsy: true })).notEmpty().withMessage('Fund Number is required when assigning a scheme'),
  validate
];

const schemeValidation = [
  body('Name').trim().notEmpty().withMessage('Scheme Name is required').escape(),
  body('Total_Amount').isFloat({ min: 0 }).withMessage('Total Amount must be a positive number'),
  body('Amount_per_month').isFloat({ min: 0 }).withMessage('Amount per month must be a positive number'),
  body('Number_of_due').isInt({ min: 1 }).withMessage('Number of dues must be at least 1'),
  body('Period').optional().trim().escape(),
  body('Month_from').optional().trim(),
  body('Month_to').optional().trim(),
  validate
];

const paymentValidation = [
  body('Fund_Number').trim().notEmpty().withMessage('Fund Number is required'),
  body('Customer_ID').optional().trim(),
  body('Scheme_ID').optional().isInt(),
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
