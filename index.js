const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const key = process.env.ENCRYPTION_KEY;
const iv = process.env.ENCRYPTION_IV;
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

function decrypt(encryptedText) {
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedText, 'base64', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
}

app.post('/webhook', async (req, res) => {
    try {
        const encryptedPayload = req.body.data;
        const decryptedData = decrypt(encryptedPayload);

        await fetch(discordWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: decryptedData,
        });

        res.status(200).send('Webhook forwarded successfully.');
    } catch (error) {
        console.error('Error forwarding webhook:', error);
        res.status(500).send('Error processing webhook');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
