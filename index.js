const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const app = express();
app.use(express.json());

const key = process.env.ENCRYPTION_KEY;
const iv = process.env.ENCRYPTION_IV;
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL; // For Moderator Join
const discordWebhookUrl2 = process.env.DISCORD_WEBHOOK2_URL; // For Moderator Messages

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
            
            const webhookData = jsonPayload.data;
            
            const webhookUrl = jsonPayload.event === 'mod_join' ? discordWebhookUrl : discordWebhookUrl2;

            const discordResponse = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookData)
            });

            if (!discordResponse.ok) {
                console.error(`Failed to send to Discord: ${discordResponse.statusText}`);
                return res.status(500).send('Failed to forward to Discord');
            }
            
            console.log(`Successfully forwarded ${jsonPayload.event} event to Discord`);
        } catch (err) {
            console.error('Decryption or parsing failed:', err);
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
