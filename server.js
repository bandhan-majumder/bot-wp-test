const express = require('express');
const app = express();
const VERIFY_TOKEN = "your_unique_verify_token";
const axios = require('axios');

async function sendWhatsAppTemplate() {
    try {
        const response = await axios({
            method: 'POST',
            url: 'https://graph.facebook.com/v21.0/572643735931375/messages',
            headers: {
                'Authorization': 'Bearer EAAHE4DDAyWsBO71OKlNFBL2tc6VWyNt9EUBJFU5bNSHeZBe1O93bMyZA7K5UukEHEZBnFsKNaLTKzSzungxNbSSYo6OqCyN6OnuRdbEroxx8OfwlKdl9BcEoeg9aMTQf9SUK6vm5xZC6ZBVmZBTERQOrgCYtQpR6iB8XVNWsYOhiKll0OviBmznJ6ZCwbBUzHXNt4j4GbulTNdaeZABp2bo36J5o6JJvfmMGRtU3P6zXP505jFEPR1MZD',
                'Content-Type': 'application/json'
            },
            data: {
                messaging_product: "whatsapp",
                to: "918617284049",
                type: "template",
                template: {
                    name: "demo_booking",
                    language: {
                        code: "en_US"
                    },
                    components: [{
                        type: "body",
                        parameters: [{
                            type: "text",
                            text: "VOZI"
                        }]
                    }]
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

    const fullMessage = JSON.stringify(body.entry[0].changes, null, 2);
    console.log('Received webhook:', fullMessage[0].messages);

    if (body.object) {
        if (body.entry &&
            body.entry[0].changes &&
            body.entry[0].changes[0].value.messages &&
            body.entry[0].changes[0].value.messages[0]
        ) {
            try{
                const resp  = await sendWhatsAppTemplate();
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