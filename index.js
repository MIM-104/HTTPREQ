require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const shift = parseInt(process.env.ENCRYPTION_KEY);
const joinWebhookUrl = process.env.JOIN_WEBHOOK_URL;
const logsWebhookUrl = process.env.LOGS_WEBHOOK_URL;

function decrypt(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const decryptedCharCode = ((charCode - key) + 256) % 256;
        result += String.fromCharCode(decryptedCharCode);
    }
    return result;
}

app.post('/', async (req, res) => {
    try {
        const encryptedPayload = req.body.data;

        if (!encryptedPayload) {
            return res.status(400).send("Missing encrypted payload");
        }

        const decryptedText = decrypt(encryptedPayload, shift);

        let decryptedMessage;
        try {
            decryptedMessage = JSON.parse(decryptedText);
        } catch (error) {
            return res.status(400).send("Invalid JSON format in decrypted message");
        }

        console.log("Decrypted message:", decryptedMessage);

        if (!decryptedMessage.identifier || !decryptedMessage.content) {
            return res.status(400).send("Invalid decrypted message format");
        }

        let webhookUrl;
        if (decryptedMessage.identifier === "join") {
            webhookUrl = joinWebhookUrl;
        } else if (decryptedMessage.identifier === "logs") {
            webhookUrl = logsWebhookUrl;
        } else {
            return res.status(400).send("Unknown identifier");
        }

        await axios.post(webhookUrl, {
            content: decryptedMessage.content,
            embeds: decryptedMessage.embeds || []
        });

        res.status(200).send("Notification sent successfully");
    } catch (error) {
        console.error("Error processing request:", error.stack);
        res.status(500).send(`Failed to process notification: ${error.message}`);
    }
});

app.get('/health', (req, res) => {
    res.status(200).send('Server is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
