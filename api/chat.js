export default async function handler(req, res) {
    // Vercel automatically injects this securely on the server
    const apiKey = process.env.GEMINI_KEY; 
    
    if (!apiKey) {
        return res.status(500).json({ error: "Gemini API Key is missing on Vercel dashboard." });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { promptText, inlineData, context, query } = req.body;
        let payload = {};

        // If it's a direct chat query with context
        if (context || query) {
            payload = {
                contents: [{ parts: [{ text: `Context Material:\n${context || ""}\n\nStudent Question: ${query || ""}` }] }]
            };
        } 
        // If it's an image/document extraction task
        else {
            payload = {
                contents: [{
                    parts: [
                        { text: promptText },
                        ...(inlineData ? [{ inlineData }] : [])
                    ]
                }]
            };
        }

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await geminiRes.json();
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: "Failed to connect to Gemini API backend." });
    }
}

