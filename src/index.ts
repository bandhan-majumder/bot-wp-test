import express, { Request, Response } from "express";
import bodyParser from "body-parser";

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

app.post("/webhook", (req: Request, res: Response) => {
    const data = req.body;

    if (data.object === "whatsapp_business_account") {
        data.entry.forEach((entry: any) => {
            const changes = entry.changes;
            changes.forEach((change: any) => {
                const value = change.value;
                if (value.messaging_product === "whatsapp" && change.field === "messages") {
                    const message = value.messages[0];
                    const contact = value.contacts[0];
                    const response = {
                        from: message.from,
                        id: message.id,
                        timestamp: message.timestamp,
                        text: message.text.body,
                        contactName: contact.profile.name,
                        contactWaId: contact.wa_id
                    };
                    console.log("Received message:", response);
                    res.status(200).send("EVENT_RECEIVED");
                }
            });
        });
    } else {
        res.sendStatus(404);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});