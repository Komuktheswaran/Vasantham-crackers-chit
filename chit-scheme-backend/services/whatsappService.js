const axios = require('axios');

const API_KEY = "bde37d9b-1854-11f1-8191-02c8a5e042bd";
const API_URL = "https://partnersv1.pinbot.ai/v3/973662325833527/messages";

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
      messaging_product: "whatsapp",
      to: formattedDestination,
      type: "template",
      template: {
        name: campaignName,
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: templateParams.map(val => ({
              type: "text",
              text: String(val)
            }))
          }
        ]
      }
    };

    console.log(`📱 Sending WhatsApp Template [${campaignName}] to ${formattedDestination} Params:`, templateParams);

    const response = await axios.post(API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'apiKey': API_KEY // Pinbot often expects apiKey in header
      }
    });

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
