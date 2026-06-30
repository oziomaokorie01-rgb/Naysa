const AudioEngine = {
    isOffline: false,
    audioElement: document.getElementById('hiddenAudioDeck'),

    setOfflineMode(status) {
        this.isOffline = status;
    },

    async playContent(text, persona, voice) {
        const structuralPrompt = `[Persona: ${persona}]: ${text}`;
        
        if (this.isOffline) {
            this.updateWidget("▶️", "Native TTS", "Speaking Offline...");
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(structuralPrompt);
            
            if(voice === "Emma") utterance.pitch = 0.7;
            if(voice === "Zainab") utterance.pitch = 1.2;
            
            utterance.onend = () => this.updateWidget("⏹️", "Senseii Audio Deck", "Finished");
            window.speechSynthesis.speak(utterance);
            this.syncMediaSession("Native Offline Audio");
        } else {
            this.updateWidget("🔄", "YarnGPT Proxy Engine", "Streaming Voice...");
            
            // Route through local secure backend layer
            const backendEndpoint = "http://localhost:5000/api/tts";

            try {
                const response = await fetch(backendEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text: structuralPrompt,
                        voice: voice.toLowerCase()
                    })
                });

                if(!response.ok) throw new Error("Local proxy dropped or reported failure code.");
                
                const blob = await response.blob();
                this.audioElement.src = URL.createObjectURL(blob);
                this.audioElement.play();
                
                this.updateWidget("▶️", `YarnGPT: ${voice}`, "Playing");
                this.syncMediaSession(`Senseii Class (${voice})`);
            } catch (err) {
                console.error(err);
                alert("YarnGPT proxy stream failed. Dropping back down onto client device voice synthesis framework.");
                document.getElementById('networkToggle').click();
            }
        }
    },

    control(action) {
        if (this.isOffline) {
            if (action === 'pause' || action === 'stop') window.speechSynthesis.pause();
            if (action === 'play') window.speechSynthesis.resume();
            this.updateWidget(action === 'stop' ? "⏹️" : "⏸️", "Native TTS", action.toUpperCase());
            return;
        }

        if (action === 'play') {
            this.audioElement.play();
            this.updateWidget("▶️", "YarnGPT Stream", "Playing");
        } else if (action === 'pause') {
            this.audioElement.pause();
            this.updateWidget("⏸️", "YarnGPT Stream", "Paused");
        } else if (action === 'stop') {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.updateWidget("⏹️", "YarnGPT Stream", "Stopped");
        }
    },

    updateWidget(icon, title, state) {
        document.getElementById('audioStateIcon').innerText = icon;
        document.getElementById('audioTrackTitle').innerText = title;
        document.getElementById('audioTrackStatus').innerText = state;
    },

    syncMediaSession(trackTitle) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: trackTitle,
                artist: 'Senseii Hybrid Tutor',
                album: 'NAYSA Ecosystem'
            });
            navigator.mediaSession.setActionHandler('play', () => this.control('play'));
            navigator.mediaSession.setActionHandler('pause', () => this.control('pause'));
            navigator.mediaSession.setActionHandler('stop', () => this.control('stop'));
        }
    }
};