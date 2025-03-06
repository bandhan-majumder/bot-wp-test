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
    CONFIRMING_PICKUP: 'confirming_pickup',
    ASKING_DROPOFF: 'asking_dropoff',
    TERMINAL_SELECTION: 'terminal_selection',
    CONFIRMING: 'confirming',
    COMPLETED: 'completed',
    CONFIRMING_TIME: 'confirming_time',
    CONFIRMING_BOOKING: 'confirming_booking'
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
const sendLocationConfirmTemplate = require('./template/confirmLocation.js');
const sendBookingConfirmTemplate = require('./template/bookingConfirm.js');
const axios = require('axios');
const extractDateAndTime = require('./helpers/timeMatch.js');

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
    try {
        if (typeof value != Object) {
            return await redis.set(`user:${userPhone}:data`, key, value);
        } else {
            return await redis.hset(`user:${userPhone}:data`, key, JSON.stringify(value));
        }
    } catch (e) {
        console.log("Error in saving user data", e);
    }
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

async function userPossibleLocations(userPhone, allPossibleLocations) {
    await redis.set(`user:${userPhone}:possibleLocations`, JSON.stringify(allPossibleLocations));
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

            // Handle reset command
            if (JSON.parse(userText).match(/start again/i)) {
                console.log(`data is reset for ${userPhone} : ${await getAllUserData(userPhone)}`);
                await resetUserData(userPhone);
                await sendGreetingsTemplate(userPhone);
                await updateUserState(userPhone, userStates.INITIAL);
                res.sendStatus(200);
            }
            // Handle based on current state and message content
            else if ((userText.match(/hi/i) || userText.match(/hello/i)) && currentState === userStates.INITIAL) {
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
                        const possibleLocations = await getLocation(pickupLocation);
                        await userPossibleLocations(userPhone, possibleLocations);
                        const resp = await sendPossibleLocationTemplate(userPhone, possibleLocations);
                        await updateUserState(userPhone, userStates.CONFIRMING_PICKUP); // Update state to confirm pickup location
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
            // confirm pickup location input
            else if (currentState === userStates.CONFIRMING_PICKUP) {
                const selectedOption = parseInt(JSON.parse(userText));
                if (selectedOption >= 1 && selectedOption <= 5) {
                    try {
                        const possibleLocations = await redis.get(`user:${userPhone}:possibleLocations`);
                        const selectedLocation = JSON.parse(possibleLocations)[selectedOption - 1];
                        console.log(selectedLocation);
                        await saveUserData(userPhone, 'confirmedPickupLocation', selectedLocation);
                        const resp = await sendLocationConfirmTemplate(userPhone, selectedLocation.label);
                        console.log("User state is: ", await getUserState(userPhone));
                        await updateUserState(userPhone, userStates.CONFIRMING_TIME);
                        console.log(resp);
                        res.sendStatus(200);
                    } catch (e) {
                        console.log("Error in confirming pickup location", e);
                        res.sendStatus(404);
                    }
                } else {
                    console.error(userPhone, "Invalid selection. Please select a number between 1 and 5.");
                    res.sendStatus(200);
                }
            }
            else if (currentState === userStates.CONFIRMING_TIME) {
                await saveUserData(userPhone, 'time', userText);
                try {
                    const userTime = extractDateAndTime(userText);
                    console.log("User time is: ", userTime);
                    if(userTime){

                    } else {
                        throw new Error("Invalid time format");
                    }
                } catch (e) {
                    console.log("Time should be in given format. Eg: January 10th at 10:00 AM", e);
                }
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
