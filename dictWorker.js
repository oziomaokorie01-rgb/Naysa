// dictWorker.js - Runs entirely in the background
self.onmessage = async function(e) {
    if (e.data.action === 'SEED_DATABASE') {
        try {
            const res = await fetch("https://raw.githubusercontent.com/matthewreagan/Web-Words/master/words.json");
            const rawData = await res.json();
            
            // Open DB and write records cleanly away from the UI thread
            const request = indexedDB.open("SenseiiCompleteDB", 1);
            request.onsuccess = function(evt) {
                const db = evt.target.result;
                const tx = db.transaction(["words"], "readwrite");
                const store = tx.objectStore("words");
                
                Object.keys(rawData).forEach(key => {
                    store.put({ word: key.toLowerCase(), definition: rawData[key] });
                });
                
                tx.oncomplete = () => {
                    self.postMessage({ status: 'READY' });
                };
            };
        } catch (err) {
            self.postMessage({ status: 'ERROR', error: err.message });
        }
    }
};
