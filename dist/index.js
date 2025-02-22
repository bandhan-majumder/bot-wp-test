"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const app = (0, express_1.default)();
const PORT = 3000;
app.use(body_parser_1.default.json());
app.post("/webhook", (req, res) => {
    const data = req.body;
    if (data.object === "whatsapp_business_account") {
        data.entry.forEach((entry) => {
            const changes = entry.changes;
            changes.forEach((change) => {
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
    }
    else {
        res.sendStatus(404);
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
