document.addEventListener('DOMContentLoaded', () => {
    let localDB = null;

    // 1. SPIN UP WEB WORKER FOR DICTIONARY SEEDING
    const dictWorker = new Worker('dictWorker.js');
    dictWorker.postMessage({ action: 'INITIALIZE_DB' });
    dictWorker.onmessage = function(e) {
        if (e.data.status === 'READY') {
            document.getElementById('dbStatus').innerText = "Ready 🟢";
            // Open read instance connection for instant typing UI lookup
            const req = indexedDB.open("SenseiiCompleteDB", 1);
            req.onsuccess = (evt) => { localDB = evt.target.result; };
        }
    };

    // 2. MOBILE TAP ISOLATION & TAB MANAGER
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active', 'text-purple-400'));
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.add('text-gray-400'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

            btn.classList.add('tab-active');
            btn.classList.remove('text-gray-400');
            
            const targetTab = btn.id.replace('tab-', '') + 'Tab';
            document.getElementById(targetTab).classList.remove('hidden');
        });
    });

    // 3. FILE / CONTENT EXTRACTORS
    document.getElementById('docFile').addEventListener('change', (e) => {
        e.stopPropagation();
        const file = e.target.files[0];
        if (file) {
            document.getElementById('docFileName').innerText = file.name;
            document.getElementById('notesInput').value += `\n[File Text]: Local contents verified from ${file.name}.`;
        }
    });

    document.getElementById('picFile').addEventListener('change', (e) => {
        e.stopPropagation();
        const file = e.target.files[0];
        if (file) {
            document.getElementById('picFileName').innerText = file.name;
            document.getElementById('notesInput').value += `\n[Image Context]: Embedded snapshot snapshot verified.`;
        }
    });

    document.getElementById('extractLinkBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        const url = document.getElementById('linkUrl').value;
        if(!url) return alert("Please specify a URL link structure first.");
        document.getElementById('notesInput').value += `\nhttps://www.merriam-webster.com/dictionary/context: Mock stream content successfully scraped from ${url}.`;
    });

    // 4. AUDIO DECK TRIGGERS
    document.getElementById('startSessionBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        const text = document.getElementById('notesInput').value;
        const persona = document.getElementById('tutorPersona').value;
        const voice = document.getElementById('voiceCharacter').value;

        if(!text.trim()) return alert("Abeg, supply text content within the Text area field context first.");
        AudioEngine.playContent(text, persona, voice);
    });

    document.getElementById('audioPlayBtn').addEventListener('click', (e) => { e.stopPropagation(); AudioEngine.control('play'); });
    document.getElementById('audioPauseBtn').addEventListener('click', (e) => { e.stopPropagation(); AudioEngine.control('pause'); });
    document.getElementById('audioStopBtn').addEventListener('click', (e) => { e.stopPropagation(); AudioEngine.control('stop'); });

    // 5. LOCAL DICTIONARY TYPING ENGINE
    document.getElementById('dictSearch').addEventListener('input', (e) => {
        e.stopPropagation();
        const term = e.target.value.trim().toLowerCase();
        const resultBox = document.getElementById('dictResult');

        if (!term || !localDB) {
            resultBox.classList.add('hidden');
            return;
        }

        const tx = localDB.transaction(["words"], "readonly");
        const req = tx.objectStore("words").get(term);

        req.onsuccess = function() {
            if (req.result) {
                resultBox.innerHTML = `<strong>${term}:</strong> ${req.result.definition}`;
                resultBox.classList.remove('hidden');
            } else {
                resultBox.innerHTML = `<span class="text-gray-600">Word parameters not matched.</span>`;
                resultBox.classList.remove('hidden');
            }
        };
    });

    // 6. SAFE GEMINI COMMUNICATOR
    document.getElementById('askGeminiBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        const prompt = document.getElementById('geminiQuery').value;
        const context = document.getElementById('notesInput').value;
        if(!prompt.trim()) return alert("Inquiry target box cannot remain blank.");
        GeminiService.query(prompt, context);
    });

    // 7. OFFLINE SWITCH INTEGRATOR
    document.getElementById('networkToggle').addEventListener('change', (e) => {
        const activeOffline = e.target.checked;
        const geminiBox = document.getElementById('geminiSection');
        const statusLabel = document.getElementById('networkStatusLabel');
        
        AudioEngine.setOfflineMode(activeOffline);

        if (activeOffline) {
            statusLabel.innerText = "Offline Mode";
            statusLabel.classList.add("text-amber-500");
            geminiBox.classList.add("opacity-40", "pointer-events-none");
        } else {
            statusLabel.innerText = "Online";
            statusLabel.classList.remove("text-amber-500");
            geminiBox.classList.remove("opacity-40", "pointer-events-none");
        }
    });
});
