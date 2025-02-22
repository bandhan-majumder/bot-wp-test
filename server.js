const express = require('express');
const app = express();// Your verify token (create a unique string)
const VERIFY_TOKEN = "your_unique_verify_token";// Webhook verification endpoint
app.get('/webhook', (req, res) => {
    // Parse parameters from the webhook verification request
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];    // Check if a token and mode were sent
    if (mode && token) {
        // Check the mode and token sent are correct
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            // Respond with 200 OK and challenge token
            console.log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
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

// Webhook for receiving messages
app.post('/webhook', express.json(), (req, res) => {
    // Parse the request body from the POST
    let body = req.body;    // Check if this is a webhook event
    if (body.object) {
        if (body.entry && 
            body.entry[0].changes && 
            body.entry[0].changes[0].value.messages && 
            body.entry[0].changes[0].value.messages[0]
        ) {
            let phone_number_id = body.entry[0].changes[0].value.metadata.phone_number_id;
            let from = body.entry[0].changes[0].value.messages[0].from;
            let msg_body = body.entry[0].changes[0].value.messages[0].text.body;            console.log('Received message:', {
                phone_number_id,
                from,
                msg_body
            });            // Send 200 OK response
            res.sendStatus(200);
        } else {
            // Return a '404 Not Found' if event is not recognized
            res.sendStatus(404);
        }
    } else {
        // Return a '404 Not Found' if event is not recognized
        res.sendStatus(404);
    }
});const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Webhook server is listening on port ${port}`);
});