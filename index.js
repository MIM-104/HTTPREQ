const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
app.use(express.json());

const encryptionKey = process.env.ENCRYPTION_KEY || "vVx~D)V0(77jKF~Fv)3uBnDK.yKejleY";
const iv = Buffer.alloc(16, 0);

function decrypt(encryptedData) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'utf8'), iv);
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}

app.post('/', async (req, res) => {
    try {
        console.log("Request body:", req.body);

        const encryptedPayload = req.body.data;

        if (!encryptedPayload) {
            throw new Error("Missing encrypted data in the request body");
        }

        const decryptedMessage = decrypt(encryptedPayload);
        console.log("Decrypted message:", decryptedMessage);

        const { identifier, content, embeds } = decryptedMessage;
        let discordWebhookUrl = "";

        if (identifier === "join") {
            discordWebhookUrl = process.env.JOIN_WEBHOOK_URL;
        } else if (identifier === "logs") {
            discordWebhookUrl = process.env.LOGS_WEBHOOK_URL;
        }

        if (!discordWebhookUrl) {
            throw new Error("Invalid identifier or missing webhook URL");
        }

        await axios.post(discordWebhookUrl, {
            content: content || null,
            embeds: embeds || []
        });

        res.status(200).send("Notification sent successfully");
    } catch (error) {
        console.error("Error processing request:", error.message);
        res.status(500).send("Failed to process notification");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
