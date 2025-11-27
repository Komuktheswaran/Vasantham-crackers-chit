// Helper function to convert JSON to CSV
const xlsx = require('xlsx');
const convertToCsv = (data) => {
    if (!data || data.length === 0) {
        return '';
    }
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
        headers.map(header => JSON.stringify(row[header])).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
};

// Helper function to parse Excel (XLSX) buffer into array of rows (arrays)
const parseExcel = (buffer) => {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Convert to JSON with header row as first row
    const sheetData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    // Remove header row (index 0) and return remaining rows
    return sheetData.slice(1);
};
module.exports = {
    convertToCsv,
    parseExcel,
};
