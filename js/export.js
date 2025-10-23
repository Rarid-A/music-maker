// EXPORT MODULE - Recording and export functionality
class ExportManager {
    constructor(audioManager, channelManager, sequencer) {
        this.audioManager = audioManager;
        this.channelManager = channelManager;
        this.sequencer = sequencer;
        this.recordedChunks = [];
        this.recorder = null;
    }

    async exportLoop() {
        await this.audioManager.startAudio();
        
        // Edge case: Check if there are any patterns
        const hasPatterns = this.channelManager.getChannels().some(ch => 
            ch.pattern.some(step => Object.keys(step).length > 0)
        );
        
        if (!hasPatterns) {
            alert('No patterns to export! Add some notes to the grid first.');
            return;
        }
        
        const mediaStream = this.audioManager.getMediaStream();
        if (!mediaStream) { 
            alert('Audio stream not ready. Please wait for audio to initialize.'); 
            return;
        }
        
        // Save playback state
        const wasPlaying = this.sequencer.getIsPlaying();
        if (wasPlaying) {
            Tone.Transport.stop();
            this.sequencer.stopSequencer();
            this.sequencer.isPlaying = false;
            this.channelManager.releaseAllNotes();
        }
        
        // Mute the main destination so user doesn't hear the recording
        const originalVolume = Tone.Destination.volume.value;
        Tone.Destination.volume.value = -Infinity;
        
        this.audioManager.showLoadingIndicator(true, 'Preparing export...');
        
        try {
            // Check supported mime types
            let mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm;codecs=opus';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'audio/ogg;codecs=opus';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        throw new Error('No supported audio format found');
                    }
                }
            }
            
            this.recordedChunks = [];
            this.recorder = new MediaRecorder(mediaStream, { mimeType });
            
            this.recorder.ondataavailable = (e) => { 
                if (e.data.size > 0) this.recordedChunks.push(e.data); 
            };
            
            this.recorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: mimeType });
                
                // Stop playback and release all notes BEFORE restoring volume
                Tone.Transport.stop();
                this.sequencer.stopSequencer();
                this.channelManager.releaseAllNotes();
                
                // Small delay to ensure all notes are released
                setTimeout(() => {
                    // Restore original volume
                    Tone.Destination.volume.value = originalVolume;
                    
                    // Convert and download
                    this.convertAndDownloadMP3(blob);
                    
                    // Resume playback if it was playing before
                    if (wasPlaying) {
                        setTimeout(() => {
                            Tone.Transport.start();
                            this.sequencer.startSequencer();
                            this.sequencer.isPlaying = true;
                        }, 100);
                    }
                }, 50);
            };
            
            this.recorder.start();
            
            // Calculate loop duration
            const loopDuration = Tone.Time(Tone.Transport.loopEnd).toSeconds();
            
            this.audioManager.showLoadingIndicator(true, `Recording ${this.sequencer.getBarCount()} bar loop (silent)...`);
            
            // Reset transport position to start of loop
            Tone.Transport.position = 0;
            this.sequencer.currentStep = 0;
            
            // Start playback for recording (but muted so user doesn't hear it)
            Tone.Transport.start();
            this.sequencer.startSequencer();
            
            // Record for exactly one loop
            setTimeout(() => {
                this.recorder.stop();
                
                // Don't restore volume here - let recorder.onstop handle it
                // This prevents the stuck note from playing loudly
            }, loopDuration * 1000 + 100); // Add 100ms buffer
            
        } catch (error) {
            console.error('Export error:', error);
            alert('Export error: ' + error.message);
            this.audioManager.showLoadingIndicator(false);
            
            // Restore volume
            Tone.Destination.volume.value = originalVolume;
            
            // Resume playback if it was playing before error
            if (wasPlaying) {
                Tone.Transport.start();
                this.sequencer.startSequencer();
                this.sequencer.isPlaying = true;
            }
        }
    }

    async convertAndDownloadMP3(webmBlob) {
        this.audioManager.showLoadingIndicator(true, 'Converting to MP3...');
        
        try {
            const mp3Blob = await this.convertToMp3(webmBlob);
            const url = URL.createObjectURL(mp3Blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `music-${Date.now()}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up after a delay
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            alert('✅ Recording downloaded successfully!');
        } catch (error) {
            console.error('MP3 conversion failed:', error);
            console.log('Downloading as WebM instead...');
            
            const url = URL.createObjectURL(webmBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `music-${Date.now()}.webm`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            alert('⚠️ Downloaded as WebM format (MP3 conversion not available)');
        } finally {
            this.audioManager.showLoadingIndicator(false);
        }
    }

    async convertToMp3(webmBlob) {
        const self = this;
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.onload = async function() {
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const audioBuffer = await audioContext.decodeAudioData(this.result);
                    const channels = audioBuffer.numberOfChannels;
                    const sampleRate = audioBuffer.sampleRate;
                    const samples = audioBuffer.length;
                    const left = audioBuffer.getChannelData(0);
                    const right = channels > 1 ? audioBuffer.getChannelData(1) : left;
                    const leftPCM = self.floatTo16BitPCM(left);
                    const rightPCM = self.floatTo16BitPCM(right);
                    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);
                    const mp3Data = [];
                    const sampleBlockSize = 1152;
                    for (let i = 0; i < samples; i += sampleBlockSize) {
                        const leftChunk = leftPCM.subarray(i, i + sampleBlockSize);
                        const rightChunk = rightPCM.subarray(i, i + sampleBlockSize);
                        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
                        if (mp3buf.length > 0) mp3Data.push(mp3buf);
                    }
                    const mp3buf = mp3encoder.flush();
                    if (mp3buf.length > 0) mp3Data.push(mp3buf);
                    const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
                    resolve(mp3Blob);
                } catch (error) { reject(error); }
            };
            fileReader.onerror = (error) => reject(error);
            fileReader.readAsArrayBuffer(webmBlob);
        });
    }

    floatTo16BitPCM(float32Array) {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return int16Array;
    }
}

// Export for use in other modules
window.ExportManager = ExportManager;
