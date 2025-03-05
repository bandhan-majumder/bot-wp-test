const express = require('express');
const app = express();
const VERIFY_TOKEN = "your_unique_verify_token";
const Redis = require('ioredis');
const constants = require('./constants.js');
const { getLocations } = require('./apis/maps.js');

const getLocation = async (input) => {
    const possibleLocationJson = await getLocations(input);
    console.log("Possible locations:", possibleLocationJson);
    return possibleLocationJson;
};

const redis = new Redis(
    constants.REDIS_URL,
    {
        tls: {
            rejectUnauthorized: true
        }
    }
);

// User states
const userStates = {
    INITIAL: 'initial',
    SERVICE_SELECTION: 'service_selection',
    SERVICES_OPTION: 'services_option',
    ASKING_PICKUP: 'asking_pickup',
    ASKING_DROPOFF: 'asking_dropoff',
    TERMINAL_SELECTION: 'terminal_selection',
    CONFIRMING: 'confirming',
    COMPLETED: 'completed'
};

// Import the templates
const sendGreetingsTemplate = require('./template/greetings.js');
const sendServiceSelectionTemplate = require('./template/serviceSelection.js');
const sendAirportPickupConfirmationTemplate = require('./template/airportPickupConfirmation.js');
const sendAirportDropoffSelectionTemplate = require('./template/airportDropoffSelection.js');
const sendFromAirportPickupSelectionTemplate = require('./template/fromAirportPickupSelection.js');
const sendFinalBookingMsgTemplate = require('./template/finalBookingMsg.js');
const sendServicesOptionTemplate = require('./template/servicesOption.js');
const sendPossibleLocationTemplate = require('./template/possibleLocationOptions.js');
const axios = require('axios');

/**
 * This module provides functions to interact with user state and data stored in Redis.
 * 
 * Functions:
 * 
 * 1. getUserState(userPhone):
 *    - Retrieves the state of a user based on their phone number.
 *    - @param {string} userPhone - The phone number of the user.
 *    - @returns {Promise<string>} - The state of the user.
 * 
 * 2. updateUserState(userPhone, newState):
 *    - Updates the state of a user based on their phone number.
 *    - @param {string} userPhone - The phone number of the user.
 *    - @param {string} newState - The new state to set for the user.
 *    - @returns {Promise<string>} - The result of the update operation.
 * 
 * 3. saveUserData(userPhone, key, value):
 *    - Saves a key-value pair in the user's data hash.
 *    - @param {string} userPhone - The phone number of the user.
 *    - @param {string} key - The key to save in the user's data.
 *    - @param {string} value - The value to save in the user's data.
 *    - @returns {Promise<number>} - The result of the save operation.
 * 
 * 4. getUserData(userPhone, key):
 *    - Retrieves a value from the user's data hash based on a key.
 *    - @param {string} userPhone - The phone number of the user.
 *    - @param {string} key - The key to retrieve from the user's data.
 *    - @returns {Promise<string>} - The value associated with the key.
 * 
 * 5. getAllUserData(userPhone):
 *    - Retrieves all key-value pairs from the user's data hash.
 *    - @param {string} userPhone - The phone number of the user.
 *    - @returns {Promise<Object>} - An object containing all key-value pairs.
 * 
 * 6. resetUserData(userPhone):
 *    - Deletes the user's state and data from Redis.
 *    - @param {string} userPhone - The phone number of the user.
 *    - @returns {Promise<void>} - The result of the delete operation.
 */

async function getUserState(userPhone) {
    return await redis.get(`user:${userPhone}:state`);
}

async function updateUserState(userPhone, newState) {
    return await redis.set(`user:${userPhone}:state`, newState);
}

async function saveUserData(userPhone, key, value) {
    return await redis.hset(`user:${userPhone}:data`, key, value);
}

async function getUserData(userPhone, key) {
    return await redis.hget(`user:${userPhone}:data`, key);
}

async function getAllUserData(userPhone) {
    return await redis.hgetall(`user:${userPhone}:data`);
}

async function resetUserData(userPhone) {
    await redis.del(`user:${userPhone}:state`);
    await redis.del(`user:${userPhone}:data`);
}

// Route handlers
app.get('/webhook', (req, res) => {
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        message: 'Webhook server is running'
    });
});

app.post('/webhook', express.json(), async (req, res) => {
    let body = req.body;
    // check if messages exists in the response or not
    if (body.entry[0].changes[0].value.messages) {
        const userTextType = body.entry[0].changes[0].value.messages[0].type;
        console.log("body is: ", body.entry[0]);
        const userPhone = constants.RECIEVER_NO;
        console.log("User phone is: ", userPhone);

        // Get current user state from Redis
        let currentState = await getUserState(userPhone) || userStates.INITIAL;

        // Handle text messages
        if (userTextType.toString() === "text") {
            // extract the user text
            const userText = JSON.stringify(body.entry[0].changes[0].value.messages[0].text.body);

            // Handle based on current state and message content
            if ((userText.match(/hi/i) || userText.match(/hello/i)) && currentState === userStates.INITIAL) {
                try {
                    const resp = await sendGreetingsTemplate(userPhone);
                    await updateUserState(userPhone, userStates.INITIAL);
                    console.log(resp);
                    res.sendStatus(200);
                } catch (e) {
                    console.log("Error in sending response", e);
                    res.sendStatus(404);
                }
            }
            // Handle pickup location input
            else if (currentState === userStates.ASKING_PICKUP) {
                try {
                    const pickupLocation = userText;

                    await saveUserData(userPhone, 'pickupLocation', pickupLocation);

                    try {
                        console.log("Pickup  location is: ", pickupLocation);
                        const possibleLocations = await getLocation(pickupLocation);
                        console.log("Possible locations:", possibleLocations);
                        const resp = await sendPossibleLocationTemplate(userPhone, possibleLocations);
                        await updateUserState(userPhone, userStates.ASKING_PICKUP);
                        console.log(resp);
                        res.sendStatus(200);
                    } catch (e) {
                        console.log("Error in sending response in pickup selection", e);
                        res.sendStatus(404);
                    }
                } catch (e) {
                    console.log("Error processing pickup location:", e);
                    res.sendStatus(404);
                }
            }
            // Handle dropoff location
            // else if (currentState === userStates.ASKING_DROPOFF) {
            //     try {
            //         await saveUserData(userPhone, 'dropoffLocation', userText);

            //         // Get the pickup location and ask for confirmation
            //         const pickupLocation = await getUserData(userPhone, 'pickupLocationFormatted') || await getUserData(userPhone, 'pickupLocation');

            //         await updateUserState(userPhone, userStates.CONFIRMING);
            //         await sendMessage(userPhone, `Please confirm: Pickup from ${pickupLocation} and dropoff at ${userText}?`);
            //         res.sendStatus(200);
            //     } catch (e) {
            //         console.log("Error processing dropoff location:", e);
            //         res.sendStatus(404);
            //     }
            // }
            // // Handle other states/text inputs as needed
            // else {
            //     // Default response for unhandled states or text
            //     console.log("Unhandled state/text combination");
            //     res.sendStatus(200);
            // }

            // Handle reset command
            else if (userText.match(/start again/i)) {
                console.log(`data is reset for ${userPhone} : ${await getAllUserData(userPhone)}`);
                await resetUserData(userPhone);
                await sendGreetingsTemplate(userPhone);
                await updateUserState(userPhone, userStates.INITIAL);
                res.sendStatus(200);
            }
        }
        // Handle button interactions
        else if (userTextType.toString() === "button") {
            const buttonPayload = body.entry[0].changes[0].value.messages[0].button.payload;
            console.log("Button payload:", buttonPayload);

            if (buttonPayload.match(/start booking/i)) {
                try {
                    const resp = await sendServiceSelectionTemplate(userPhone);
                    await updateUserState(userPhone, userStates.SERVICE_SELECTION);
                    console.log(resp);
                    res.sendStatus(200);
                } catch (e) {
                    console.log("Error in sending response", e);
                    res.sendStatus(404);
                }
            }
            else if (buttonPayload.match(/book a ride/i)) {
                try {
                    const resp = await sendServicesOptionTemplate(userPhone);
                    await updateUserState(userPhone, userStates.SERVICES_OPTION);
                    console.log(resp);
                    res.sendStatus(200);
                } catch (e) {
                    console.log("Error in sending response", e);
                    res.sendStatus(404);
                }
            }
            else if (buttonPayload.match(/need a ride home!/i)) {
                try {
                    const resp = await sendFromAirportPickupSelectionTemplate(userPhone);
                    await updateUserState(userPhone, userStates.TERMINAL_SELECTION);
                    console.log(resp);
                    res.sendStatus(200);
                } catch (e) {
                    console.log("Error in sending response", e);
                    res.sendStatus(404);
                }
            }
            else if (buttonPayload.match(/terminal 1/i) || buttonPayload.match(/terminal 2/i)) {
                try {
                    await saveUserData(userPhone, 'terminal', buttonPayload);
                    const resp = await sendAirportPickupConfirmationTemplate(userPhone, buttonPayload);
                    await updateUserState(userPhone, userStates.ASKING_PICKUP);
                    console.log(resp);
                    res.sendStatus(200);
                } catch (e) {
                    console.log("Error in sending response", e);
                    res.sendStatus(404);
                }
            }
            // else if (buttonPayload.match(/confirm/i) && currentState === userStates.CONFIRMING) {
            //     try {
            //         // Get all user data to create a final booking
            //         const userData = await getAllUserData(userPhone);

            //         // Send final booking confirmation
            //         const resp = await sendFinalBookingMsgTemplate(userPhone, userData);
            //         await updateUserState(userPhone, userStates.COMPLETED);
            //         console.log(resp);
            //         res.sendStatus(200);
            //     } catch (e) {
            //         console.log("Error in sending final confirmation", e);
            //         res.sendStatus(404);
            //     }
            // }
            // else if (buttonPayload.match(/cancel/i) && currentState === userStates.CONFIRMING) {
            //     try {
            //         // Reset the state to start over
            //         await updateUserState(userPhone, userStates.INITIAL);
            //         await sendMessage(userPhone, "Booking cancelled. Say 'hi' to start over.");
            //         res.sendStatus(200);
            //     } catch (e) {
            //         console.log("Error in cancelling booking", e);
            //         res.sendStatus(404);
            //     }
            // }
            // Handle other button payloads based on state
        }
    } else {
        console.log("No messages in request or improperly formatted request");
        res.sendStatus(200);
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Webhook server is listening on port ${port}`);
});
