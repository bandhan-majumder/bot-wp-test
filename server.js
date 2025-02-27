const express = require('express');
const app = express();
const VERIFY_TOKEN = "your_unique_verify_token";

// import the templates
const sendGreetingsTemplate = require('./template/greetings.js');
const sendServiceSelectionTemplate = require('./template/serviceSelection.js');
const sendAirportPickupConfirmationTemplate = require('./template/airportPickupConfirmation.js');
const sendAirportDropoffSelectionTemplate = require('./template/airportDropoffSelection.js');
const sendFromAirportPickupSelectionTemplate = require('./template/fromAirportPickupSelection.js');
const sendFinalBookingMsgTemplate = require('./template/finalBookingMsg.js');
const sendServicesOptionTemplate = require('./template/servicesOption.js');
const { default: axios } = require('axios');

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
        message: 'Webhook server is'
    });
});

app.post('/webhook', express.json(), async (req, res) => {
    let body = req.body;
    // check if messages exists in the response or not
    if (body.entry[0].changes[0].value.messages) {
        const userTextType = body.entry[0].changes[0].value.messages[0].type;
        console.log("User text type is: ", userTextType);

        // initial message from the user
        if (userTextType.toString() === "text") {
            // extract the user text
            const userText = JSON.stringify(body.entry[0].changes[0].value.messages[0].text.body);

            // greet user if user sends a greeting message
            if (userText.match(/hi/i) || userText.match(/hello/i)) {
                try {
                    const resp = await sendGreetingsTemplate(process.env.RECIEVER_NO);
                    console.log(resp);
                    res.sendStatus(200);
                } catch (e) {
                    console.log("Error in sending response", e);
                    res.sendStatus(404);
                }
            }

            // user puts location for drop off/picup
            if (userText.startsWith('pick:')) {
                const userInputlocation = userText.split(/pick:/i)[1];

                // get all the possible locations
                const possibleLocationJson = axios.get(`https://api.olamaps.io/places/v1/autocomplete?input=${userInputlocation}&location=12.9705675,77.6325204&api_key=${process.env.OLAMAPS_API_KEY}`);
                const locations = possibleLocationJson.predictions.map(prediction => prediction.description);

                console.log("All the locations are: ", locations);
            }
        }

        // configure template responses
        if (userTextType.toString() === "button") {
            // user interacts with the template
            const templateReply = body.entry[0].changes[0].value.messages[0].button.payload;
            console.log("Template reply is: ", templateReply);
            // user selects to which service to book
            if (templateReply.match(/start booking/i)) {
                try {
                    const resp = await sendServiceSelectionTemplate(process.env.RECIEVER_NO);
                    console.log(resp);
                    res.sendStatus(200);
                } catch (e) {
                    console.log("Error in sending response", e);
                    res.sendStatus(404);
                }
            }

            // user selects to book a ride from airport or from a location
            if (templateReply.match(/book a ride/i)) {
                try {
                    const resp = await sendServicesOptionTemplate(process.env.RECIEVER_NO);
                    console.log(resp);
                    res.sendStatus(200);
                } catch (e) {
                    console.log("Error in sending response", e);
                    res.sendStatus(404);
                }
            }

            // user needs a home ride
            if (templateReply.match(/need a ride home!/i)) {
                try {
                    const resp = await sendFromAirportPickupSelectionTemplate(process.env.RECIEVER_NO);
                    console.log(resp);
                    res.sendStatus(200);
                } catch (e) {
                    console.log("Error in sending response", e);
                    res.sendStatus(404);
                }
            }

            // user selects a terminal to be picked up from
            if (templateReply.match(/terminal 1/i) || templateReply.match(/terminal 2/i)) {
                try {
                    const resp = await sendAirportPickupConfirmationTemplate(process.env.RECIEVER_NO, templateReply);
                    console.log(resp);
                    res.sendStatus(200);
                } catch (e) {
                    console.log("Error in sending response", e);
                    res.sendStatus(404);
                }
            }
        }
    } else {
        console.log("other logs");
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Webhook server is listening on port ${port}`);
});
