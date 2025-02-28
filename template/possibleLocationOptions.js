const axios = require('axios');
const constants = require('../constants.js');

module.exports = async function sendPossibleLocationTemplate(recpNo, allPossibleLocations) {
    // format all the possible locations into the required format
    console.log("All local possible locations: ", allPossibleLocations);
    console.log("type of possible locations is: ", typeof allPossibleLocations);
    try {
        const components = allPossibleLocations.map(location => ({
            type: "body",
            parameters: [{
                type: "text",
                text: location.label
            }]
        }));

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
                    name: "select_location",
                    language: {
                        code: "en"
                    },
                    components: components
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