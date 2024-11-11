require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());

const shift = parseInt(process.env.ENCRYPTION_KEY) || 3;

function caesarDecrypt(text, shift) {
    let result = '';
    shift = shift % 26;

    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        let code = text.charCodeAt(i);

        if (code >= 65 && code <= 90) {
            char = String.fromCharCode(((code - 65 - shift + 26) % 26) + 65);
        } else if (code >= 97 && code <= 122) {
            char = String.fromCharCode(((code - 97 - shift + 26) % 26) + 97);
        }
        result += char;
    }
    return JSON.parse(result);
}

app.post('/', (req, res) => {
    try {
        const encryptedPayload = req.body.data;
        const decryptedMessage = caesarDecrypt(encryptedPayload, shift);

        console.log("Decrypted message:", decryptedMessage);
        res.status(200).send("Decrypted successfully");
    } catch (error) {
        console.error("Error processing request:", error.message);
        res.status(500).send("Failed to process notification");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
