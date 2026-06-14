export default async function handler(req, res) {
    // This pulls YOUR key from your Vercel Dashboard Environment Variables safely
    const apiKey = process.env.GEMINI_KEY; 
    
    if (!apiKey) {
        return res.status(500).json({ error: "Gemini API Key is missing on the Vercel server." });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { context, query, inlineData, promptText } = req.body;
        let finalPrompt = "";

        if (context || query) {
            finalPrompt = `You are Senseii, an intelligent, relatable study buddy tutor. Use the following context material to answer the student's question clearly.\n\nContext Material:\n${context || "None"}\n\nStudent Question: ${query}`;
        } else {
            finalPrompt = promptText || "Extract and read all text content verbatim.";
        }

        const payload = {
            contents: [{
                parts: [
                    { text: finalPrompt },
                    ...(inlineData ? [{ inlineData }] : [])
                ]
            }]
        };

        // FIXED: Switched to the correct stable v1 endpoint so it works out of the box
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await geminiRes.json();
        
        if (data.error) {
            return res.status(400).json({ error: data.error.message });
        }

        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: "Failed to connect to Gemini API backend pipeline." });
    }
}
