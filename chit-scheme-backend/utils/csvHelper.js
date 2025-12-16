/**
 * CSV Helper Utility
 * Converts JSON data to CSV format
 */

/**
 * Escapes special characters in CSV fields
 * @param {string} field - The field value to escape
 * @returns {string} - Escaped field value
 */
const escapeCSVField = (field) => {
  if (field === null || field === undefined) {
    return '';
  }
  
  const stringValue = String(field);
  
  // If field contains comma, newline, or quote, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
};

/**
 * Converts array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Array of column definitions {key, header}
 * @returns {string} - CSV formatted string
 */
const convertToCSV = (data, columns) => {
  // Create header row
  const headers = columns.map(col => escapeCSVField(col.header)).join(',');

  if (!data || data.length === 0) {
    return headers;
  }
  
  // Create data rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      return escapeCSVField(value);
    }).join(',');
  });

  // Combine header and rows
  return [headers, ...rows].join('\n');
};

/**
 * Formats date for CSV export
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string (DD-MM-YYYY)
 */
const formatDateForCSV = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}-${month}-${year}`;
};

module.exports = {
  convertToCSV,
  escapeCSVField,
  formatDateForCSV
};
