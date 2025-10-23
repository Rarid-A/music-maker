// SEQUENCER MODULE - Pattern sequencing and playback
class Sequencer {
    constructor(channelManager) {
        this.channelManager = channelManager;
        this.sequencerLoop = null;
        this.currentStep = 0;
        this.gridSize = 16; // 4th notes = 16 steps per bar
        this.barCount = 1; // Start with 1 bar for simplicity
        this.isPlaying = false;
        this.currentTempo = 120;
        
        // Constants
        this.notes = ['D#5', 'C5', 'B4', 'A#4', 'A4', 'G#4', 'G4', 'F#4', 'F4', 'E4', 'D#4', 'D4', 'C#4', 'C4', 'B3', 'A#3', 'A3', 'G#3', 'G3', 'F#3', 'F3', 'E3', 'D#3', 'D3', 'C#3', 'C3'];
        this.drumLabels = ['kick', 'snare', 'hihat', 'clap'];
    }

    init() {
        Tone.Transport.bpm.value = this.currentTempo;
        Tone.Transport.loop = true;
        this.updateLoopEnd();
    }

    updateLoopEnd() {
        Tone.Transport.loopEnd = `${this.barCount}m`;
    }

    getTotalSteps() {
        return this.gridSize * this.barCount;
    }

    resizePatterns() {
        const newTotalSteps = this.getTotalSteps();
        
        // Edge case: Validate new total steps
        if (newTotalSteps <= 0 || newTotalSteps > 128) {
            console.error('Invalid total steps:', newTotalSteps);
            return;
        }
        
        this.channelManager.getChannels().forEach(channel => {
            if (!channel.pattern) {
                channel.pattern = Array(newTotalSteps).fill(null).map(() => ({}));
                return;
            }
            
            const oldPattern = channel.pattern;
            const newPattern = Array(newTotalSteps).fill(null).map(() => ({}));
            
            // Copy over existing pattern data up to the minimum of old/new length
            const copyLength = Math.min(oldPattern.length, newPattern.length);
            for (let i = 0; i < copyLength; i++) {
                newPattern[i] = { ...oldPattern[i] };
            }
            
            channel.pattern = newPattern;
        });
    }

    startSequencer() {
        if (this.sequencerLoop) return;
        
        this.currentStep = 0;
        const totalSteps = this.getTotalSteps();
        const noteValue = this.gridSize === 16 ? '16n' : this.gridSize === 8 ? '8n' : '4n';
        
        this.sequencerLoop = new Tone.Loop((time) => {
            this.channelManager.getChannels().forEach(channel => {
                if (channel.muted) return; // Skip muted channels
                
                const step = channel.pattern[this.currentStep];
                if (step && channel.instrumentType === 'drums') {
                    this.drumLabels.forEach(drumType => {
                        if (step[drumType]) {
                            this.channelManager.playDrum(channel, drumType, time);
                        }
                    });
                } else if (step) {
                    this.notes.forEach(note => {
                        if (step[note]) {
                            this.channelManager.playNote(channel, note, time);
                        }
                    });
                }
            });
            
            // Update beat counter
            const bar = Math.floor(this.currentStep / this.gridSize) + 1;
            const beat = Math.floor((this.currentStep % this.gridSize) / 4) + 1;
            const tick = (this.currentStep % 4) + 1;
            
            // Visual feedback
            Tone.Draw.schedule(() => {
                // Update beat counter display
                const beatCounter = document.getElementById('beatCounter');
                if (beatCounter) {
                    beatCounter.textContent = `${bar}.${beat}.${tick}`;
                }
                
                // Highlight current step
                document.querySelectorAll('.sequencer-step').forEach((el, index) => {
                    const stepPos = index % totalSteps;
                    if (stepPos === this.currentStep) {
                        el.style.borderColor = '#667eea';
                        el.style.boxShadow = '0 0 10px rgba(102, 126, 234, 0.5)';
                    } else if (el.classList.contains('beat')) {
                        el.style.borderColor = '#555';
                        el.style.boxShadow = 'none';
                    } else {
                        el.style.borderColor = '#3a3a4a';
                        el.style.boxShadow = 'none';
                    }
                });
            }, time);
            
            this.currentStep = (this.currentStep + 1) % totalSteps;
        }, noteValue);
        
        this.sequencerLoop.start(0);
    }

    stopSequencer() {
        if (this.sequencerLoop) {
            this.sequencerLoop.stop();
            this.sequencerLoop.dispose();
            this.sequencerLoop = null;
        }
        this.currentStep = 0;
        
        // Reset beat counter
        const beatCounter = document.getElementById('beatCounter');
        if (beatCounter) {
            beatCounter.textContent = '1.1.1';
        }
        
        // Reset visual feedback
        document.querySelectorAll('.sequencer-step').forEach(el => {
            if (el.classList.contains('beat')) {
                el.style.borderColor = '#555';
            } else {
                el.style.borderColor = '#3a3a4a';
            }
            el.style.boxShadow = 'none';
        });
    }

    async togglePlay() {
        if (this.isPlaying) {
            Tone.Transport.pause();
            this.stopSequencer();
            this.isPlaying = false;
        } else {
            Tone.Transport.start();
            this.startSequencer();
            this.isPlaying = true;
        }
    }

    stop() {
        Tone.Transport.stop();
        this.stopSequencer();
        this.isPlaying = false;
    }

    setTempo(tempo) {
        this.currentTempo = Math.max(40, Math.min(200, tempo));
        Tone.Transport.bpm.value = this.currentTempo;
    }

    setGridSize(size) {
        this.gridSize = size;
        this.resizePatterns();
    }

    setBarCount(count) {
        this.barCount = count;
        this.updateLoopEnd();
        this.resizePatterns();
    }

    getGridSize() {
        return this.gridSize;
    }

    getBarCount() {
        return this.barCount;
    }

    getCurrentStep() {
        return this.currentStep;
    }

    getIsPlaying() {
        return this.isPlaying;
    }

    getNotes() {
        return this.notes;
    }

    getDrumLabels() {
        return this.drumLabels;
    }

    clearPattern() {
        const channel = this.channelManager.getSelectedChannel();
        if (!channel) {
            alert('Please select a channel first');
            return;
        }
        
        if (confirm(`Clear all patterns for "${channel.name}"?`)) {
            const totalSteps = this.getTotalSteps();
            channel.pattern = Array(totalSteps).fill(null).map(() => ({}));
        }
    }
}

// Export for use in other modules
window.Sequencer = Sequencer;
