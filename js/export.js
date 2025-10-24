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
            Tone.Transport.cancel(); // Cancel all scheduled events immediately
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

    exportMIDI() {
        // Stop playback if playing
        const wasPlaying = this.sequencer.getIsPlaying();
        if (wasPlaying) {
            Tone.Transport.stop();
            Tone.Transport.cancel(); // Cancel all scheduled events immediately
            this.sequencer.stopSequencer();
            this.sequencer.isPlaying = false;
            this.channelManager.releaseAllNotes();
        }
        
        // Check if there are any patterns
        const hasPatterns = this.channelManager.getChannels().some(ch => 
            ch.pattern.some(step => Object.keys(step).length > 0)
        );
        
        if (!hasPatterns) {
            alert('No patterns to export! Add some notes to the grid first.');
            return;
        }
        
        try {
            // Create MIDI file structure
            const midi = this.createMIDIFile();
            const blob = new Blob([midi], { type: 'audio/midi' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `music-${Date.now()}.mid`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            alert('✅ MIDI file exported successfully!');
        } catch (error) {
            console.error('MIDI export error:', error);
            alert('❌ Error exporting MIDI: ' + error.message);
        }
    }

    createMIDIFile() {
        // MIDI file format basics
        const tempo = this.sequencer.currentTempo;
        const ppq = 480; // Pulses per quarter note
        const gridSize = this.sequencer.getGridSize();
        const barCount = this.sequencer.getBarCount();
        
        // Calculate ticks per step based on grid
        const ticksPerBeat = ppq;
        const beatsPerBar = 4;
        const stepsPerBeat = gridSize / beatsPerBar;
        const ticksPerStep = ticksPerBeat / stepsPerBeat;
        
        // Header chunk
        const header = this.createMIDIHeader(this.channelManager.getChannels().length, ppq);
        
        // Create tracks for each channel
        const tracks = this.channelManager.getChannels().map((channel, index) => {
            return this.createMIDITrack(channel, index, tempo, ticksPerStep);
        });
        
        // Combine header and tracks
        return this.combineMIDIChunks(header, tracks);
    }

    createMIDIHeader(numTracks, ppq) {
        const header = new Uint8Array(14);
        // "MThd" chunk
        header[0] = 0x4D; header[1] = 0x54; header[2] = 0x68; header[3] = 0x64;
        // Chunk length (always 6 for header)
        header[4] = 0x00; header[5] = 0x00; header[6] = 0x00; header[7] = 0x06;
        // Format type (1 = multiple tracks, synchronous)
        header[8] = 0x00; header[9] = 0x01;
        // Number of tracks
        header[10] = (numTracks >> 8) & 0xFF;
        header[11] = numTracks & 0xFF;
        // Pulses per quarter note
        header[12] = (ppq >> 8) & 0xFF;
        header[13] = ppq & 0xFF;
        
        return header;
    }

    createMIDITrack(channel, trackIndex, tempo, ticksPerStep) {
        const events = [];
        let currentTime = 0;
        
        // Add track name
        const trackName = `Track ${trackIndex + 1}: ${channel.name}`;
        events.push(this.createMetaEvent(0, 0x03, trackName));
        
        // Add tempo (only on first track)
        if (trackIndex === 0) {
            const microsecondsPerBeat = Math.floor(60000000 / tempo);
            events.push(this.createTempoEvent(0, microsecondsPerBeat));
        }
        
        // Process pattern
        const noteMap = this.getNoteMap(channel.instrumentType);
        const totalSteps = this.sequencer.getTotalSteps();
        
        for (let stepIndex = 0; stepIndex < totalSteps; stepIndex++) {
            const step = channel.pattern[stepIndex];
            if (step) {
                Object.keys(step).forEach(noteOrDrum => {
                    if (step[noteOrDrum]) {
                        const midiNote = noteMap[noteOrDrum];
                        if (midiNote !== undefined) {
                            const timeInTicks = Math.floor(stepIndex * ticksPerStep);
                            const velocity = step[noteOrDrum].velocity ? Math.floor(step[noteOrDrum].velocity * 127) : 90;
                            const duration = Math.floor(ticksPerStep * 0.9); // 90% of step duration
                            
                            // Note on
                            events.push({ time: timeInTicks, type: 'noteOn', note: midiNote, velocity });
                            // Note off
                            events.push({ time: timeInTicks + duration, type: 'noteOff', note: midiNote });
                        }
                    }
                });
            }
        }
        
        // Sort events by time
        events.sort((a, b) => a.time - b.time);
        
        // Add end of track
        const endTime = Math.floor(totalSteps * ticksPerStep);
        events.push({ time: endTime, type: 'endOfTrack' });
        
        return this.encodeMIDITrack(events);
    }

    getNoteMap(instrumentType) {
        if (instrumentType === 'drums') {
            return {
                kick: 36,
                snare: 38,
                hihat: 42,
                clap: 39
            };
        } else {
            // Standard note to MIDI number mapping
            const noteToMidi = {
                'C3': 48, 'C#3': 49, 'D3': 50, 'D#3': 51, 'E3': 52, 'F3': 53, 'F#3': 54, 'G3': 55, 'G#3': 56, 'A3': 57, 'A#3': 58, 'B3': 59,
                'C4': 60, 'C#4': 61, 'D4': 62, 'D#4': 63, 'E4': 64, 'F4': 65, 'F#4': 66, 'G4': 67, 'G#4': 68, 'A4': 69, 'A#4': 70, 'B4': 71,
                'C5': 72, 'C#5': 73, 'D5': 74, 'D#5': 75, 'E5': 76, 'F5': 77, 'F#5': 78, 'G5': 79, 'G#5': 80, 'A5': 81, 'A#5': 82, 'B5': 83,
                'C2': 36, 'C#2': 37, 'D2': 38, 'D#2': 39, 'E2': 40, 'F2': 41, 'F#2': 42, 'G2': 43, 'G#2': 44, 'A2': 45, 'A#2': 46, 'B2': 47,
                'A#1': 34, 'B1': 35
            };
            return noteToMidi;
        }
    }

    createMetaEvent(deltaTime, type, text) {
        return { time: deltaTime, type: 'meta', metaType: type, data: text };
    }

    createTempoEvent(deltaTime, microsecondsPerBeat) {
        return { time: deltaTime, type: 'tempo', value: microsecondsPerBeat };
    }

    encodeMIDITrack(events) {
        const trackData = [];
        let lastTime = 0;
        
        events.forEach(event => {
            const deltaTime = event.time - lastTime;
            lastTime = event.time;
            
            // Add variable-length delta time
            trackData.push(...this.encodeVariableLength(deltaTime));
            
            if (event.type === 'noteOn') {
                trackData.push(0x90, event.note, event.velocity);
            } else if (event.type === 'noteOff') {
                trackData.push(0x80, event.note, 0x40);
            } else if (event.type === 'meta') {
                trackData.push(0xFF, event.metaType);
                const textBytes = new TextEncoder().encode(event.data);
                trackData.push(...this.encodeVariableLength(textBytes.length));
                trackData.push(...textBytes);
            } else if (event.type === 'tempo') {
                trackData.push(0xFF, 0x51, 0x03);
                trackData.push((event.value >> 16) & 0xFF, (event.value >> 8) & 0xFF, event.value & 0xFF);
            } else if (event.type === 'endOfTrack') {
                trackData.push(0xFF, 0x2F, 0x00);
            }
        });
        
        // Create track chunk
        const trackChunk = new Uint8Array(8 + trackData.length);
        trackChunk[0] = 0x4D; trackChunk[1] = 0x54; trackChunk[2] = 0x72; trackChunk[3] = 0x6B; // "MTrk"
        const length = trackData.length;
        trackChunk[4] = (length >> 24) & 0xFF;
        trackChunk[5] = (length >> 16) & 0xFF;
        trackChunk[6] = (length >> 8) & 0xFF;
        trackChunk[7] = length & 0xFF;
        trackChunk.set(trackData, 8);
        
        return trackChunk;
    }

    encodeVariableLength(value) {
        const bytes = [];
        bytes.push(value & 0x7F);
        value >>= 7;
        while (value > 0) {
            bytes.unshift((value & 0x7F) | 0x80);
            value >>= 7;
        }
        return bytes;
    }

    combineMIDIChunks(header, tracks) {
        const totalLength = header.length + tracks.reduce((sum, track) => sum + track.length, 0);
        const midi = new Uint8Array(totalLength);
        let offset = 0;
        
        midi.set(header, offset);
        offset += header.length;
        
        tracks.forEach(track => {
            midi.set(track, offset);
            offset += track.length;
        });
        
        return midi;
    }
}

// Export for use in other modules
window.ExportManager = ExportManager;
