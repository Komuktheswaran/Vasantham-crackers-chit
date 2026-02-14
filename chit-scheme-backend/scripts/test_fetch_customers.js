const axios = require('axios');

async function testFetchCustomers() {
    try {
        console.log('--- Testing getAllCustomers API ---');
        
        const response = await axios.get('http://localhost:5000/api/customers', {
            params: { limit: 1000 }
        });

        console.log('Status:', response.status);
        if (response.data && response.data.data) {
             const customers = response.data.data.customers;
             console.log('Customers Count:', customers ? customers.length : 'undefined');
             if (customers && customers.length > 0) {
                 console.log('First Customer:', customers[0]);
             }
        } else {
             console.log('Response Structure:', response.data);
        }

    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

testFetchCustomers();
