const express = require('express');
const app = express();
const VERIFY_TOKEN = "your_unique_verify_token";

// import the templates
const sendGreetingsTemplate = require('./template/greetings.js');
const sendServiceSelectionTemplate = require('./template/serviceSelection.js');
const sendAirportPickupConfirmationTemplate = require('./template/airportPickupConfirmation.js');
const sendAirportDropoffSelectionTemplate = require('./template/airportDropoffSelection.js');
const sendAirportPickupTemplate = require('./template/airportPickupSelection.js');
const sendFinalBookingMsgTemplate = require('./template/finalBookingMsg.js');

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
    if(body.entry[0].changes[0].value.messages){
        console.log("Change is: ", JSON.stringify(body.entry[0].changes[0]));
        const userTextType = JSON.stringify(body.entry[0].changes[0].value.messages[0].type);
        console.log("User text type is: ", userTextType);
        const userText = JSON.stringify(body.entry[0].changes[0].value.messages[0].text.body);
        console.log("User text is: ", userText);
    } else {
        console.log("Other logs")
    }

    if (body.object) {
        if (body.entry &&
            body.entry[0].changes &&
            body.entry[0].changes[0].value.messages &&
            body.entry[0].changes[0].value.messages[0]
        ) {
            try{
                // TODO: recpNo will be passed dynamically
                const resp  = await sendGreetingsTemplate(process.env.RECIEVER_NO);
                console.log(resp);
            } catch (e) {
                console.log("error in sending response", e);
            }

            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } else {
        res.sendStatus(404);
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Webhook server is listening on port ${port}`);
});
