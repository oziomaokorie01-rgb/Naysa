export default async function handler(req, res) {
    const falKey = process.env.FAL_KEY;

    if (!falKey) {
        return res.status(500).json({ error: "Fal.ai API Key is missing on Vercel dashboard." });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { endpointUrl, modelPayload } = req.body;

        const falRes = await fetch(endpointUrl, {
            method: "POST",
            headers: {
                "Authorization": `Key ${falKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(modelPayload)
        });

        const data = await falRes.json();
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: "Failed to connect to Fal.ai API backend." });
    }
}

