export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_KEY; 
    
    if (!apiKey) {
        return res.status(500).json({ error: "Gemini API Key is missing on Vercel dashboard." });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { promptText, inlineData, context, query } = req.body;
        let finalPrompt = "";

        // Format a single unified text prompt for Gemini to avoid payload confusion
        if (context || query) {
            finalPrompt = `You are Senseii, an intelligent, relatable study buddy tutor. Use the following context material to answer the student's question clearly.\n\nContext Material:\n${context || "None"}\n\nStudent Question: ${query}`;
        } else {
            finalPrompt = promptText || "Extract and read all text content verbatim.";
        }

        // Build a highly reliable standard payload layout
        const payload = {
            contents: [{
                parts: [
                    { text: finalPrompt },
                    ...(inlineData ? [{ inlineData }] : [])
                ]
            }]
        };

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await geminiRes.json();
        
        // Send back the raw data to the frontend
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: "Failed to connect to Gemini API backend." });
    }
}
