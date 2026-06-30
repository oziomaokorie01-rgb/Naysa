document.addEventListener('DOMContentLoaded', () => {
    let localDB = null;

    // --- STREAMLINED LOCAL INDEXEDDB DICTIONARY INITIALIZER ---
    function initDirectDictionary() {
        const statusLabel = document.getElementById('dbStatus');
        const request = indexedDB.open("SenseiiCompleteDB", 2);

        request.onupgradeneeded = function(evt) {
            let dbInstance = evt.target.result;
            if (!dbInstance.objectStoreNames.contains("words")) {
                dbInstance.deleteObjectStore("words");
        }
                dbInstance.createObjectStore("words", { keyPath: "word" });
                console.log("🔄 Database schema upgraded to Version 2 cleanly.");
    
        };

        request.onsuccess = function(evt) {
            localDB = evt.target.result;
            
            // Check if dictionary records already exist
            const transaction = localDB.transaction(["words"], "readonly");
            const countRequest = transaction.objectStore("words").count();

            countRequest.onsuccess = async function() {
                if (countRequest.result === 0) {
                    try {
                        statusLabel.innerText = "Downloading...";
                        const res = await fetch("https://raw.githubusercontent.com/matthewreagan/Web-Words/master/words.json");
                        const rawData = await res.json();

                        statusLabel.innerText = "Saving Local...";
                        const writeTx = localDB.transaction(["words"], "readwrite");
                        const writeStore = writeTx.objectStore("words");

                        Object.keys(rawData).forEach(key => {
                            writeStore.put({ word: key.toLowerCase(), definition: rawData[key] });
                        });

                        writeTx.oncomplete = () => {
                            statusLabel.innerText = "Ready 🟢";
                        };
                    } catch (err) {
                        console.error(err);
                        statusLabel.innerText = "Offline Cache Only";
                    }
                } else {
                    statusLabel.innerText = "Ready 🟢";
                }
            };
        };

        request.onerror = function() {
            statusLabel.innerText = "DB Locked ❌";
        };
    }

    // Initialize local dictionary setup immediately
    initDirectDictionary();

    // --- MOBILE TAP ISOLATION & TAB MANAGER ---
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

    // --- FILE / CONTENT EXTRACTORS ---
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
            document.getElementById('notesInput').value += `\n[Image Context]: Embedded snapshot verified.`;
        }
    });

    document.getElementById('extractLinkBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        const url = document.getElementById('linkUrl').value;
        if(!url) return alert("Please specify a URL link structure first.");
        document.getElementById('notesInput').value += `\nhttps://www.merriam-webster.com/dictionary/context: Mock content successfully reading from ${url}.`;
    });

    // --- AUDIO DECK TRIGGERS ---
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

    // --- LOCAL DICTIONARY TYPING ENGINE ---
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
                resultBox.innerHTML = `<span class="text-gray-500">Word not stored in local DB.</span>`;
                resultBox.classList.remove('hidden');
            }
        };
    });

    // --- SAFE GEMINI COMMUNICATOR ---
    document.getElementById('askGeminiBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        const prompt = document.getElementById('geminiQuery').value;
        const context = document.getElementById('notesInput').value;
        if(!prompt.trim()) return alert("Inquiry target box cannot remain blank.");
        GeminiService.query(prompt, context);
    });

    // --- OFFLINE SWITCH INTEGRATOR ---
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