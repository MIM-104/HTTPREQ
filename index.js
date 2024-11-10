const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const app = express();
app.use(express.json({ limit: '10mb', strict: false }));  // Increased limit and relaxed JSON parsing

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

app.post('/', async (req, res) => {
    console.log('Received request at root path');
    console.log('Request headers:', req.headers);
    console.log('Raw body:', req.body);
    
    try {
        // Check if request body exists
        if (!req.body) {
            console.error('No request body received');
            return res.status(400).send('No request body');
        }

        const encryptedPayload = req.body.data;
        
        // Log the type and content of the payload
        console.log('Payload type:', typeof encryptedPayload);
        console.log('Payload content:', encryptedPayload);

        if (!encryptedPayload || typeof encryptedPayload !== 'string') {
            console.error('Invalid payload format:', req.body);
            return res.status(400).send('Invalid payload format');
        }

        try {
            const decryptedData = decrypt(encryptedPayload);
            console.log('Decrypted data:', decryptedData);
            
            let jsonPayload;
            try {
                jsonPayload = JSON.parse(decryptedData);
            } catch (parseErr) {
                console.error('JSON parsing failed:', parseErr);
                return res.status(400).send('Invalid JSON in decrypted data');
            }
            
            const webhookData = jsonPayload.data;
            const webhookUrl = jsonPayload.event === 'mod_join' ? discordWebhookUrl : discordWebhookUrl2;
            
            console.log('Webhook URL:', webhookUrl);
            console.log('Webhook data:', JSON.stringify(webhookData, null, 2));

            const discordResponse = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookData)
            });

            if (!discordResponse.ok) {
                console.error('Discord API error:', {
                    status: discordResponse.status,
                    statusText: discordResponse.statusText,
                    body: await discordResponse.text()
                });
                return res.status(502).send('Failed to forward to Discord');
            }
            
            console.log('Successfully forwarded event to Discord');
            res.status(200).send('Success');
        } catch (err) {
            console.error('Processing error:', err);
            return res.status(400).send(err.message);
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).send('Internal server error');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Environment variables loaded:', {
        DISCORD_WEBHOOK_URL: !!process.env.DISCORD_WEBHOOK_URL,
        DISCORD_WEBHOOK2_URL: !!process.env.DISCORD_WEBHOOK2_URL,
        ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY,
        ENCRYPTION_IV: !!process.env.ENCRYPTION_IV
    });
});
