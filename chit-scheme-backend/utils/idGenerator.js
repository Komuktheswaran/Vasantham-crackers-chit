const crypto = require('crypto');

/**
 * Generate a unique transaction ID
 * @param {string} prefix - The prefix for the ID (e.g., 'PAY', 'AUC')
 * @returns {string} - The generated ID in format PREFIX-YYYYMMDD-XXXX
 */
const generateTransactionId = (prefix) => {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0');
  
  // Generate 4 random characters (uppercase letters and numbers)
  const randomChars = crypto.randomBytes(2).toString('hex').toUpperCase();
  
  return `${prefix}-${dateStr}-${randomChars}`;
};

module.exports = {
  generateTransactionId
};
