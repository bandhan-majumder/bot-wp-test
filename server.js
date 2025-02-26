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
    // check if messages exists in the response or not
    if (body.entry[0].changes[0].value.messages) {
        const userTextType = JSON.stringify(body.entry[0].changes[0].value.messages[0].type);
        console.log("User text type is: ", userTextType);
        const userText = JSON.stringify(body.entry[0].changes[0].value.messages[0].text.body);
        console.log("User text is: ", userText);

        console.log(userTextType === "text");
        console.log(typeof userTextType);
        console.log(userTextType.toString() === "text");
        
        console.log("coming 1-------")
        if (userTextType.toString() === "text") {
            console.log("coming 2-------")
            switch (true) {
                case /hi/i.test(userText): // Add your logic here for when the user text is "hi"
                console.log("coming 3-------")
                    try {
                        console.log("coing to send greetings template");
                        const resp = await sendGreetingsTemplate(process.env.RECIEVER_NO);
                        console.log(resp);
                        res.sendStatus(200);
                    } catch (e) {
                        console.log("Error in sending response", e);
                        res.sendStatus(404);
                    }
                    break;
                case /hello/i.test(userText):
                    try {
                        const resp = await sendGreetingsTemplate(process.env.RECIEVER_NO);
                        console.log(resp);
                        res.sendStatus(200);
                    } catch (e) {
                        console.log("Error in sending response", e);
                        res.sendStatus(404);
                    }
                    break;
                default:
                    break;
            }
        } else {
            console.log("coming 5-------")
            if (userTextType === "button"){
                console.log("User text type is button");
                console.log(body.entry[0].changes[0].value)
            }
        }
    } else {
        console.log("coming 6-------")
        console.log("Other logs", body.entry[0].changes[0]);
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Webhook server is listening on port ${port}`);
});
