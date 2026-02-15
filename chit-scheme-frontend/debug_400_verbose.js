process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const axios = require('axios');

async function runTest() {
    const API_URL = 'https://103.38.50.149:5006/api/customers';
    const config = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
            'Content-Type': 'application/json'
        }
    };
    
    const basePayload = {
        Customer_ID: `DEBUG_NEW_${Date.now()}`,
        Customer_Code: `CODE_${Date.now()}`,
        Name: "Test Name",
        PhoneNumber: "9876543210",
        Customer_Type: "New",
        Address1: "Test Address",
        State_ID: 1,
        District_ID: 1,
        Pincode: "600001"
    };

    const tests = [
        { name: "Valid String Phone", payload: basePayload },
        { name: "Literal Number Phone", payload: { ...basePayload, PhoneNumber: 9876543210, Customer_ID: basePayload.Customer_ID + "_litnum" } },
        { name: "Literal Number Pincode", payload: { ...basePayload, Pincode: 600001, Customer_ID: basePayload.Customer_ID + "_litpin" } },
        { name: "Short Name", payload: { ...basePayload, Name: "Ab", Customer_ID: basePayload.Customer_ID + "_short" } },
        { name: "Invalid Pincode (5 digits)", payload: { ...basePayload, Pincode: "12345", Customer_ID: basePayload.Customer_ID + "_pin" } },
        { name: "Missing Customer_ID", payload: { ...basePayload, Customer_ID: "" } }
    ];

    for (const t of tests) {
        console.log(`\n>>> Testing: ${t.name}`);
        try {
            const res = await axios.post(API_URL, t.payload, config);
            console.log(`  ✅ Success: ${res.status}`);
        } catch (e) {
            console.log(`  Status: ${e.response?.status}`);
            if (e.response?.data?.errors) {
                console.log('  Validation Errors:', JSON.stringify(e.response.data.errors, null, 2));
            } else {
                console.log('  Error Data:', JSON.stringify(e.response?.data, null, 2));
            }
        }
    }
}

runTest();
