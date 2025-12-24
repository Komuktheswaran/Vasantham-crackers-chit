const axios = require('axios');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZDJmZGE0YzllMGQyMzhlOGZjYzA4YyIsIm5hbWUiOiJDb21tZXJjaWFsIENvbW11bmljYXRpb24gQ29tcGFueS4iLCJhcHBOYW1lIjoiQWlTZW5zeSIsImNsaWVudElkIjoiNjVkMmZkYTRjOWUwZDIzOGU4ZmNjMDg1IiwiYWN0aXZlUGxhbiI6Ik5PTkUiLCJpYXQiOjE3MDgzMjYzMDh9.2cOar4lW4b3_z5tlgUhdgYkdCYdVOK4c0rhqpYeAC_0";
const API_URL = "https://backend.api-wa.co/campaign/smartping/api";

const testSend = async () => {
    const payload = {
        apiKey: API_KEY,
        campaignName: "welcomecccc",
        destination: "+919659130215",
        userName: "TestUser",
        templateParams: [
            "123456",
            "Ccc whatsapp"
        ]
    };

    try {
        console.log('Sending payload:', JSON.stringify(payload, null, 2));
        const response = await axios.post(API_URL, payload);
        console.log('✅ Success:', response.data);
    } catch (error) {
        console.error('❌ Error Status:', error.response?.status);
        console.error('❌ Error Data:', error.response?.data);
        console.error('❌ Error Message:', error.message);
    }
};

testSend();
