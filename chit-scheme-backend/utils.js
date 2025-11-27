// Helper function to convert JSON to CSV
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

module.exports = {
    convertToCsv,
};
