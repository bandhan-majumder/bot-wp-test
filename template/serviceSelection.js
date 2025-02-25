const axios = require('axios');

module.exports = async function sendServiceSelectionTemplate() {
    try {
        const response = await axios({
            method: 'POST',
            url: 'https://graph.facebook.com/v21.0/572643735931375/messages',
            headers: {
                'Authorization': `Bearer ${process.env.TOKEN}`,
                'Content-Type': 'application/json'
            },
            data: {
                messaging_product: "whatsapp",
                to: "918617284049",
                type: "template",
                template: {
                    name: "service_selection",
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