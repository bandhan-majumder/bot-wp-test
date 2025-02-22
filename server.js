const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
app.use(bodyParser.json());
// Your WhatsApp Cloud API credentials
const WHATSAPP_TOKEN = 'YOUR_WHATSAPP_TOKEN';
const WHATSAPP_API_URL = 'https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages';
// Store user booking states
const userStates = new Map();
// Handle incoming webhook
app.post('/webhook', async (req, res) => {
    try {
        const { entry } = req.body;
        if (!entry || !entry[0].changes || !entry[0].changes[0].value.messages) {
            return res.sendStatus(200);
        }
        const message = entry[0].changes[0].value.messages[0];
        const userPhoneNumber = message.from;
        // Handle different types of messages
        if (message.type === 'text') {
            await handleTextMessage(userPhoneNumber, message.text.body);
        } else if (message.type === 'location') {
            await handleLocationMessage(userPhoneNumber, message.location);
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.sendStatus(500);
    }
});
// Handle text messages
async function handleTextMessage(userPhoneNumber, messageText) {
    const lowerText = messageText.toLowerCase();
    if (lowerText === 'book taxi' || lowerText === 'book') {
        // Start booking flow
        userStates.set(userPhoneNumber, { state: 'AWAITING_PICKUP_LOCATION' });
        await sendMessage(userPhoneNumber, 'Please share your pickup location');
        await requestLocation(userPhoneNumber);
    }
}
// Handle location messages
async function handleLocationMessage(userPhoneNumber, location) {
    const userState = userStates.get(userPhoneNumber);
    if (!userState) {
        await sendMessage(userPhoneNumber, 'Please start booking by sending "book taxi"');
        return;
    }
    if (userState.state === 'AWAITING_PICKUP_LOCATION') {
        // Store pickup location
        userState.pickupLocation = {
            latitude: location.latitude,
            longitude: location.longitude
        };
        userState.state = 'AWAITING_DROP_LOCATION';
        await sendMessage(userPhoneNumber, 'Great! Now please share your drop location');
        await requestLocation(userPhoneNumber);
    } else if (userState.state === 'AWAITING_DROP_LOCATION') {
        // Store drop location and process booking
        userState.dropLocation = {
            latitude: location.latitude,
            longitude: location.longitude
        };
        // Calculate estimated fare and time
        const estimate = await calculateEstimate(
            userState.pickupLocation,
            userState.dropLocation
        );
        // Send booking confirmation
        await sendMessage(userPhoneNumber,
            `Estimated fare: $${estimate.fare}\n` +
            `Estimated time: ${estimate.time} minutes\n\n` +
            'Reply with "confirm" to book the taxi'
        );
        userState.state = 'AWAITING_CONFIRMATION';
    }
}
// Request location from user
async function requestLocation(userPhoneNumber) {
    try {
        const response = await axios.post(
            WHATSAPP_API_URL,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: userPhoneNumber,
                type: 'location',
                location: {
                    type: 'location_request'
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error requesting location:', error);
        throw error;
    }
}
// Send regular text message
async function sendMessage(userPhoneNumber, message) {
    try {
        const response = await axios.post(
            WHATSAPP_API_URL,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: userPhoneNumber,
                type: 'text',
                text: {
                    body: message
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}
// Calculate fare and time estimate (implement your own logic)
async function calculateEstimate(pickupLocation, dropLocation) {
    // Add your fare calculation logic here
    return {
        fare: '25.00',
        time: '15'
    };
}
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});