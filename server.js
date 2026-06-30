import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// TEST ROUTE
app.get('/', (req, res) => res.send("🚀 Senseii Backend Proxy is Live!"));

// 1. SECURE GEMINI PROXY ROUTE
app.post('/api/ask-senseii', async (req, res) => {
    try {
        const apiKey = process.env.GEMINI_KEY;
        if (!apiKey) return res.status(500).json({ error: "Gemini server key configuration missing." });

        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error("Gemini Proxy Error:", err);
        res.status(500).json({ error: "Failed to communicate securely with Gemini." });
    }
});

// 2. SECURE YARNGPT TTS PROXY ROUTE
app.post('/api/tts', async (req, res) => {
    try {
        const apiKey = process.env.YARNGPT_API_KEY;
        if (!apiKey) return res.status(500).json({ error: "YarnGPT server key configuration missing." });

        const rawVoice = req.body.voice || "Idera";
        const cleanVoice = rawVoice.charAt(0).toUpperCase() + rawVoice.slice(1).toLowerCase();

        const extendedPayload = {
            text: req.body.text,
            voice: cleanVoice,
            response_format: "mp3"
        };

        const response = await fetch("https://yarngpt.ai/api/v1/tts", {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(extendedPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ YarnGPT Error (${response.status}):`, errorText);
            return res.status(response.status).json({ error: errorText });
        }

        const audioBuffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(Buffer.from(audioBuffer));
    } catch (err) {
        console.error("YarnGPT Proxy Error:", err);
        res.status(500).json({ error: "Failed to stream audio securely from YarnGPT backend." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 NAYSA Secure Proxy running cleanly on http://localhost:${PORT}`);
});
