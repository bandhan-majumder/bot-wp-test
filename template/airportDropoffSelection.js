const axios = require('axios');
0

module.exports = async function sendAirportDropoffSelectionTemplate(recpNo) {
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
                    name: "to_airport_dropoff",
                    language: {
                        code: "en"
                    }
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