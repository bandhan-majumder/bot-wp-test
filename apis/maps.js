const axios = require('axios');
const constants = require('../constants.js');

async function getLocations(input) {
    if (Boolean(input)) {
        const response = await axios.get(
            `https://api.olamaps.io/places/v1/autocomplete`, {
                params: {
                    input: input,
                    location: '12.9705675,77.6325204',
                    api_key: constants.OLAMAPS_API_KEY
                }
            }
        );
        const { predictions } = response.data;

        const locations =  predictions?.map((location) => ({
            label: location?.description,
            value: location?.description,
        }));

        return locations;
    } else {
        return [];
    }
};

module.exports = {
    getLocations,
};