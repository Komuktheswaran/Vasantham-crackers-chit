const axios = require('axios');

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZDJmZGE0YzllMGQyMzhlOGZjYzA4YyIsIm5hbWUiOiJDb21tZXJjaWFsIENvbW11bmljYXRpb24gQ29tcGFueS4iLCJhcHBOYW1lIjoiQWlTZW5zeSIsImNsaWVudElkIjoiNjVkMmZkYTRjOWUwZDIzOGU4ZmNjMDg1IiwiYWN0aXZlUGxhbiI6Ik5PTkUiLCJpYXQiOjE3MDgzMjYzMDh9.2cOar4lW4b3_z5tlgUhdgYkdCYdVOK4c0rhqpYeAC_0";
const API_URL = "https://backend.api-wa.co/campaign/smartping/api";

/**
 * Send WhatsApp message using SmartPing API
 * @param {string} destination - Phone number with country code (e.g., +919659130215)
 * @param {string} campaignName - Name of the campaign template
 * @param {Array} templateParams - Array of parameters for the template
 */
const sendWhatsappMessage = async (destination, campaignName, templateParams = [], userName = "Customer") => {
  try {
    // Ensure destination has +91 prefix if missing and is 10 digits
    let formattedDestination = destination;
    if (destination && !destination.startsWith('+')) {
        if (destination.length === 10) {
            formattedDestination = '+91' + destination;
        } else {
             // If uncertain, leave as is, or add + prefix
             formattedDestination = '+' + destination;
        }
    }

    const payload = {
      apiKey: API_KEY,
      campaignName: campaignName,
      destination: formattedDestination,
      userName: userName,
      templateParams: templateParams
    };

    console.log(`📱 Sending WhatsApp to ${formattedDestination} (${userName}) [${campaignName}] Params:`, templateParams);

    const response = await axios.post(API_URL, payload);

    console.log('✅ WhatsApp Sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ WhatsApp Send Error:', error.response?.data || error.message);
    // Don't throw error to prevent blocking main flow
    return null;
  }
};

module.exports = {
  sendWhatsappMessage
};
