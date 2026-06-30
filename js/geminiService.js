const GeminiService = {
    async query(studentPrompt, contextText) {
        const displayResponse = document.getElementById('geminiResponse');
        displayResponse.innerHTML = "⌛ Thinking...";
        displayResponse.classList.remove('hidden');

        // Target your local secure backend route directly
        const backendEndpoint = "http://localhost:5000/api/ask-senseii";

        const safePayload = JSON.stringify({
            contents: [{
                parts: [{
                    text: `Context Reference Material:\n\"\"\"\n${contextText}\n\"\"\"\n\nStudent Inquiry: ${studentPrompt}`
                }]
            }]
        });

        try {
            const response = await fetch(backendEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: safePayload
            });

            const data = await response.json();
            const reply = data.candidates[0].content.parts[0].text;
            displayResponse.innerHTML = `<strong>Senseii:</strong> ${reply}`;
        } catch (err) {
            console.error(err);
            displayResponse.innerHTML = `<span class="text-red-400">Error transferring data via proxy framework layer.</span>`;
        }
    }
};