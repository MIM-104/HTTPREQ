const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const key = process.env.ENCRYPTION_KEY;
const iv = process.env.ENCRYPTION_IV;
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL; // For Moderator Join
const discordWebhookUrl2 = process.env.DISCORD_WEBHOOK2_URL; // For Moderator Messages

// Function to decrypt encrypted data
function decrypt(encryptedText) {
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedText, 'base64', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
}

app.post('/webhook', async (req, res) => {
    try {
        const encryptedPayload = req.body.data;

        if (!encryptedPayload || typeof encryptedPayload !== 'string') {
            return res.status(400).send('Invalid encrypted data');
        }

        let decryptedData;
        try {
            decryptedData = decrypt(encryptedPayload);
            let jsonPayload = JSON.parse(decryptedData);

            // Check if this is a "join" event or "message"
            if (jsonPayload.event === 'mod_join') {
                // Send to the moderator join webhook
                const discordResponse1 = await fetch(discordWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(jsonPayload),
                });

                if (!discordResponse1.ok) {
                    console.error('Failed to send to the moderator join Discord:', discordResponse1.statusText);
                    return res.status(500).send('Failed to forward to Discord');
                }
            } else if (jsonPayload.event === 'mod_message') {
                // Send to the moderator message webhook
                const discordResponse2 = await fetch(discordWebhookUrl2, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(jsonPayload),
                });

                if (!discordResponse2.ok) {
                    console.error('Failed to send to the moderator message Discord:', discordResponse2.statusText);
                    return res.status(500).send('Failed to forward to Discord');
                }
            } else {
                console.error('Unknown event type:', jsonPayload.event);
                return res.status(400).send('Unknown event type');
            }
        } catch (err) {
            console.error('Decryption or parsing failed', err);
            return res.status(400).send('Invalid data or failed to parse decrypted payload');
        }

        res.status(200).send('Webhook forwarded successfully.');
    } catch (error) {
        console.error('Error forwarding webhook:', error);
        res.status(500).send('Error processing webhook');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
