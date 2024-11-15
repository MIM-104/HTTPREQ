import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

const JOIN_WEBHOOK_URL = process.env.JOIN_WEBHOOK_URL;
const LOGS_WEBHOOK_URL = process.env.LOGS_WEBHOOK_URL;

if (!JOIN_WEBHOOK_URL || !LOGS_WEBHOOK_URL) {
    console.error('Missing required webhook URLs in environment variables.');
    process.exit(1);
}

const createJoinEmbed = (player) => {
    return {
        title: "Details",
        color: 3932,
        fields: [
            { name: "Place Id", value: `\`${player.placeId}\`` },
            { name: "Job Id", value: `\`${player.jobId}\`` },
            { name: "Server Link", value: `\`roblox://experiences/start?placeId=${player.placeId}&gameInstanceId=${player.jobId}\`` },
            { name: "Moderator Details", value: `\`${player.displayName} (@${player.username})\`\n\`User ID: ${player.userId}\`\n\`Account Age: ${player.accountAge} days\`` }
        ],
        author: { name: "Mod joined the server" },
        footer: {
            text: "Approved by Dr. Heinz Doofenshmirtz.",
            icon_url: "https://i.ibb.co/G5DDZjS/Lofgfgo.png"
        },
        timestamp: new Date().toISOString()
    };
};

const sendWebhook = async (url, payload) => {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Failed to send webhook:', error);
        return false;
    }
};

app.post('/', async (req, res) => {
    const { identifier, data } = req.body;

    if (!identifier || !data) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    let webhookPayload;
    let webhookUrl;

    switch (identifier) {
        case 'join':
            webhookUrl = JOIN_WEBHOOK_URL;
            webhookPayload = {
                embeds: [createJoinEmbed(data)]
            };
            break;

        case 'logs':
            webhookUrl = LOGS_WEBHOOK_URL;
            webhookPayload = {
                content: `${data.role} ${data.displayName} (@${data.username}): ${data.message}`
            };
            break;

        default:
            return res.status(400).json({ error: 'Invalid identifier' });
    }

    const success = await sendWebhook(webhookUrl, webhookPayload);
    
    if (success) {
        res.json({ status: 'success' });
    } else {
        res.status(500).json({ error: 'Failed to send webhook' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
