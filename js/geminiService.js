const GeminiService = {
    async query(studentPrompt, contextText) {
        const displayResponse = document.getElementById('geminiResponse');
        displayResponse.innerHTML = "⌛ Thinking...";
        displayResponse.classList.remove('hidden');

        const apiKey = window.env?.GEMINI_KEY;

        // Tightly wrap inside JSON stringify serialization to safeguard payloads
        const safePayload = JSON.stringify({
            contents: [{
                parts: [{
                    text: `Context Reference Material:\n\"\"\"\n${contextText}\n\"\"\"\n\nStudent Inquiry: ${studentPrompt}`
                }]
            }]
        });

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: safePayload
            });

            const data = await response.json();
            const reply = data.candidates[0].content.parts[0].text;
            displayResponse.innerHTML = `<strong>Senseii:</strong> ${reply}`;
        } catch (err) {
            console.error(err);
            displayResponse.innerHTML = `<span class="text-red-400">Error transmitting parameters securely to Gemini endpoints.</span>`;
        }
    }
};
