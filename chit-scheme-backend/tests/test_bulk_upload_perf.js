const sql = require('mssql');
const { dbConfig } = require('../config/database');
const fs = require('fs');
const path = require('path');

// Mock request/response for controller testing
const mockRes = {
    status: function(code) { 
        this.statusCode = code; 
        return this; 
    },
    json: function(data) { 
        this.data = data; 
        return this; 
    },
    send: function(data) { 
        this.data = data; 
        return this; 
    }
};

const generateLargeCsv = (rowCount) => {
    let csvContent = "Customer_ID,First_Name,Last_Name,Phone_Number,Phone_Number2,Address1,Address2,Area,District_ID,State_ID,Pincode,Nationality\n";
    for (let i = 0; i < rowCount; i++) {
        const id = `TEST_BULK_${Date.now()}_${i}`;
        const phone = 9000000000 + i;
        csvContent += `${id},TestFirst${i},TestLast${i},${phone},${phone},Addr1,Addr2,TestArea,1,1,600001,Indian\n`;
    }
    return Buffer.from(csvContent);
};

const runTest = async () => {
    try {
        console.log('Connecting to DB...');
        // await sql.connect(dbConfig); // The controller handles connection, but we might need it for cleanup
        
        const { uploadCustomers } = require('../controllers/customerController_v2');
        
        const ROW_COUNT = 10;
        console.log(`Generating ${ROW_COUNT} rows of CSV data...`);
        const buffer = generateLargeCsv(ROW_COUNT);
        
        const req = {
            file: {
                buffer: buffer,
                originalname: 'test_bulk.csv'
            }
        };
        
        console.log('Starting upload...');
        const start = Date.now();
        console.log('Calling uploadCustomers...');
        await uploadCustomers(req, mockRes);
        console.log('Returned from uploadCustomers');
        const end = Date.now();
        
        console.log(`Upload Status: ${mockRes.statusCode || 200}`);
        console.log(`Upload Data:`, mockRes.data);
        console.log(`Time taken: ${(end - start) / 1000} seconds for ${ROW_COUNT} rows.`);
        
        // Cleanup if needed (optional, or just leave test data)
        // const pool = await sql.connect(dbConfig);
        // await pool.request().query("DELETE FROM Customer_Master WHERE Customer_ID LIKE 'TEST_BULK_%'");
        // console.log('Cleanup complete.');

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        // process.exit(0);
    }
};

runTest();
