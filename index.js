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
    try {
        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), Buffer.from(iv, 'hex'));
        let decrypted = decipher.update(encryptedText, 'base64', 'utf-8');
        decrypted += decipher.final('utf-8');
        return decrypted;
    } catch (err) {
        console.error('Decryption failed:', err);
        throw err;
    }
}

// Handle POST requests at root path
app.post('/', async (req, res) => {
    console.log('Received request at root path');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    try {
        const encryptedPayload = req.body.data;
        if (!encryptedPayload || typeof encryptedPayload !== 'string') {
            console.error('Invalid payload:', req.body);
            return res.status(400).send('Invalid encrypted data');
        }

        console.log('Encrypted payload received');
        
        try {
            const decryptedData = decrypt(encryptedPayload);
            console.log('Decrypted data:', decryptedData);
            
            const jsonPayload = JSON.parse(decryptedData);
            console.log('Parsed JSON payload:', jsonPayload);
            
            const webhookData = jsonPayload.data;
            const webhookUrl = jsonPayload.event === 'mod_join' ? discordWebhookUrl : discordWebhookUrl2;
            
            console.log('Using webhook URL:', webhookUrl);
            console.log('Sending webhook data:', JSON.stringify(webhookData, null, 2));

            const discordResponse = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookData)
            });

            const responseText = await discordResponse.text();
            console.log('Discord response:', discordResponse.status, responseText);

            if (!discordResponse.ok) {
                console.error(`Failed to send to Discord: ${discordResponse.status} ${discordResponse.statusText}`);
                return res.status(500).send('Failed to forward to Discord');
            }
            
            console.log(`Successfully forwarded ${jsonPayload.event} event to Discord`);
            res.status(200).send('Webhook forwarded successfully.');
        } catch (err) {
            console.error('Decryption or parsing failed:', err);
            return res.status(400).send('Invalid data or failed to parse decrypted payload');
        }
    } catch (error) {
        console.error('Error forwarding webhook:', error);
        res.status(500).send('Error processing webhook');
    }
});

// Simple health check endpoint
app.get('/', (req, res) => {
    res.send('Server is running');
});

// Log environment variables (excluding sensitive values)
console.log('Environment check:', {
    'DISCORD_WEBHOOK_URL exists': !!process.env.DISCORD_WEBHOOK_URL,
    'DISCORD_WEBHOOK2_URL exists': !!process.env.DISCORD_WEBHOOK2_URL,
    'ENCRYPTION_KEY exists': !!process.env.ENCRYPTION_KEY,
    'ENCRYPTION_IV exists': !!process.env.ENCRYPTION_IV
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
