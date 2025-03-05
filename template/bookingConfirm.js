const axios = require('axios');
const constants = require('../constants.js');

module.exports = async function sendBookingConfirmTemplate(recpNo, pickup, dropoff, date, time) {
    try {
        const response = await axios({
            method: 'POST',
            url: 'https://graph.facebook.com/v22.0/572643735931375/messages',
            headers: {
                'Authorization': `Bearer ${constants.TOKEN}`,
                'Content-Type': 'application/json'
            },
            data: {
                messaging_product: "whatsapp",
                to: recpNo,
                type: "template",
                template: {
                    name: "booking_summary",
                    language: {
                        code: "en"
                    },
                    components: [{
                        type: "body",
                        parameters: [{
                            type: "text",
                            text: pickup
                        },{
                            type: "text",
                            text: dropoff
                        },{
                            type: "text",
                            text: date
                        },{
                            type: "text",
                            text: time
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