const axios = require('axios');
const constants = require('../constants.js');

module.exports = async function sendAirportPickupConfirmationTemplate(recpNo, terminal) {
    try {
        const response = await axios({
            method: 'POST',
            url: 'https://graph.facebook.com/v21.0/572643735931375/messages',
            headers: {
                'Authorization': `Bearer ${constants.TOKEN}`,
                'Content-Type': 'application/json'
            },
            data: {
                messaging_product: "whatsapp",
                to: recpNo,
                type: "template",
                template: {
                    name: "airport_pickup_confirmation",
                    language: {
                        code: "en"
                    },
                    components: [{
                        type: "body",
                        parameters: [{
                            type: "text",
                            text: terminal // terminal number
                        }]
                    }]
                }
            }
        });
        console.log('Response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error:', error.response?.data || error);
        throw error;
    }
}