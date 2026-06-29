// Background Worker Thread
self.onmessage = async function(e) {
    if (e.data.action === 'INITIALIZE_DB') {
        const request = indexedDB.open("SenseiiCompleteDB", 1);

        request.onupgradeneeded = function(evt) {
            let dbInstance = evt.target.result;
            if (!dbInstance.objectStoreNames.contains("words")) {
                dbInstance.createObjectStore("words", { keyPath: "word" });
            }
        };

        request.onsuccess = function(evt) {
            const db = evt.target.result;
            
            // Check if population is needed
            const transaction = db.transaction(["words"], "readonly");
            const countRequest = transaction.objectStore("words").count();

            countRequest.onsuccess = async function() {
                if (countRequest.result === 0) {
                    try {
                        const res = await fetch("https://raw.githubusercontent.com/matthewreagan/Web-Words/master/words.json");
                        const rawData = await res.json();

                        const writeTx = db.transaction(["words"], "readwrite");
                        const writeStore = writeTx.objectStore("words");

                        Object.keys(rawData).forEach(key => {
                            writeStore.put({ word: key.toLowerCase(), definition: rawData[key] });
                        });

                        writeTx.oncomplete = () => {
                            self.postMessage({ status: 'READY' });
                        };
                    } catch (err) {
                        self.postMessage({ status: 'ERROR', message: err.message });
                    }
                } else {
                    self.postMessage({ status: 'READY' });
                }
            };
        };
    }
};
