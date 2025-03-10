const axios = require('axios');
const constants = require('../constants.js');

module.exports = async function sendPossibleLocationTemplate(recpNo, allPossibleLocations) {
    try {
        if (!Array.isArray(allPossibleLocations)) {
            throw new Error("Expected an array but received: " + JSON.stringify(allPossibleLocations));
        }

        const parameters = allPossibleLocations.slice(0, 5).map(location => {
            if (!location || typeof location.value !== "string") {
                throw new Error("Invalid location object: " + JSON.stringify(location));
            }
            return { type: "text", text: location.value };
        });
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
                    name: "select_location_5",
                    language: {
                        code: "en"
                    },
                    components: [{
                        type: "body",
                        parameters: parameters
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