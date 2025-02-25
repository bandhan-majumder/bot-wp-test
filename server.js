const express = require('express');
const app = express();
const VERIFY_TOKEN = "your_unique_verify_token";
const axios = require('axios');
require('dotenv').config();
const sendServiceSelectionTemplate = require('./template/serviceSelection.js');
const sendGreetingsTemplate = require('./template/greetings.js');

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
    console.log("Change is: ", body.entry[0].changes[0]);
    console.log("Change is: ", body.entry[0].changes[0].value);

    if (body.object) {
        if (body.entry &&
            body.entry[0].changes &&
            body.entry[0].changes[0].value.messages &&
            body.entry[0].changes[0].value.messages[0]
        ) {
            try{
                const resp  = await sendGreetingsTemplate();
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