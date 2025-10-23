// AUDIO MODULE - Tone.js and audio context management
class AudioManager {
    constructor() {
        this.audioStarted = false;
        this.mediaStream = null;
        this.mediaStreamDestination = null;
    }

    async startAudio() {
        if (this.audioStarted) return;
        
        // Show loading indicator
        this.showLoadingIndicator(true, 'press a key to start...');
        
        try {
            // Check browser compatibility
            if (!window.AudioContext && !window.webkitAudioContext) {
                throw new Error('Web Audio API is not supported in your browser');
            }
            
            await Tone.start();
            this.audioStarted = true;
            this.setupRecording();
            
            console.log('Audio started successfully');
        } catch (error) {
            console.error('Audio start error:', error);
            alert('Error starting audio: ' + error.message);
        } finally {
            this.showLoadingIndicator(false);
        }
    }

    setupRecording() {
        try {
            // Check MediaRecorder support
            if (!window.MediaRecorder) {
                console.warn('MediaRecorder is not supported in your browser');
                return;
            }
            
            const toneContext = Tone.getContext();
            const audioContext = toneContext.rawContext || toneContext._context;
            this.mediaStreamDestination = audioContext.createMediaStreamDestination();
            this.mediaStream = this.mediaStreamDestination.stream;
        } catch (error) {
            console.error('Recording setup error:', error);
            alert('Recording feature is not available: ' + error.message);
        }
    }

    showLoadingIndicator(show, message = 'Loading...') {
        let indicator = document.getElementById('loadingIndicator');
        
        if (show) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'loadingIndicator';
                indicator.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 30px 50px;
                    border-radius: 15px;
                    z-index: 2000;
                    font-size: 1.2em;
                    text-align: center;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                `;
                document.body.appendChild(indicator);
            }
            indicator.innerHTML = `
                <div style="margin-bottom: 15px;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #667eea; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
                <div>${message}</div>
            `;
            indicator.style.display = 'block';
        } else {
            if (indicator) {
                indicator.style.display = 'none';
            }
        }
    }

    // Add CSS animation for loading spinner
    addSpinnerStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    getMediaStream() {
        return this.mediaStream;
    }

    getMediaStreamDestination() {
        return this.mediaStreamDestination;
    }

    isAudioStarted() {
        return this.audioStarted;
    }
}

// Export for use in other modules
window.AudioManager = AudioManager;
