// CHANNELS MODULE - Channel management and instrument creation
class ChannelManager {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.channels = [];
        this.selectedChannelId = null;
        this.channelIdCounter = 1;
    }

    addChannel(name, instrumentType = 'synth', waveType = 'sine') {
        // Edge case: Check if too many channels
        if (this.channels.length >= 16) {
            alert('Maximum 16 channels reached. Please remove a channel before adding a new one.');
            return null;
        }
        
        // Edge case: Validate name
        if (!name || name.trim().length === 0) {
            name = `Channel ${this.channelIdCounter}`;
        }
        
        const id = this.channelIdCounter++;
        let instrument;
        
        // Create different instrument types
        if (instrumentType === 'drums') {
            // Create drum machine with individual drum sounds
            instrument = {
                kick: new Tone.MembraneSynth().toDestination(),
                snare: new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.2 } }).toDestination(),
                hihat: new Tone.MetalSynth({ frequency: 200, envelope: { attack: 0.001, decay: 0.1, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination(),
                clap: new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.15 } }).toDestination()
            };
            // Connect to media stream
            if (this.audioManager.getMediaStreamDestination()) {
                instrument.kick.connect(this.audioManager.getMediaStreamDestination());
                instrument.snare.connect(this.audioManager.getMediaStreamDestination());
                instrument.hihat.connect(this.audioManager.getMediaStreamDestination());
                instrument.clap.connect(this.audioManager.getMediaStreamDestination());
            }
        } else if (instrumentType === 'bass') {
            instrument = new Tone.MonoSynth({
                oscillator: { type: 'sawtooth' },
                envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.1 },
                filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.2, baseFrequency: 200, octaves: 2.6 }
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -10;
        } else if (instrumentType === 'acidbass') {
            // TB-303 style acid bass for techno
            instrument = new Tone.MonoSynth({
                oscillator: { type: 'sawtooth' },
                envelope: { attack: 0.001, decay: 0.1, sustain: 0.0, release: 0.01 },
                filter: { Q: 15, type: 'lowpass', rolloff: -24 },
                filterEnvelope: { 
                    attack: 0.001, 
                    decay: 0.15, 
                    sustain: 0.0, 
                    release: 0.1, 
                    baseFrequency: 50, 
                    octaves: 4.5,
                    exponent: 2
                }
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -8;
        } else if (instrumentType === 'fmsynth') {
            // FM synthesis for lead sounds
            instrument = new Tone.FMSynth({
                harmonicity: 3,
                modulationIndex: 10,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.1 },
                modulation: { type: 'square' },
                modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.0, release: 0.1 }
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -12;
        } else if (instrumentType === 'epiano') {
            // Electric Piano for jazz
            instrument = new Tone.PolySynth(Tone.FMSynth, {
                harmonicity: 1.5,
                modulationIndex: 2,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 1.5, sustain: 0.0, release: 0.8 },
                modulation: { type: 'sine' },
                modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.0, release: 0.5 }
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -8;
        } else if (instrumentType === 'vibraphone') {
            // Vibraphone for jazz
            instrument = new Tone.PolySynth(Tone.FMSynth, {
                harmonicity: 2,
                modulationIndex: 1.5,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 2.0, sustain: 0.3, release: 2.5 },
                modulation: { type: 'sine' },
                modulationEnvelope: { attack: 0.5, decay: 1.0, sustain: 0.2, release: 1.5 }
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -10;
        } else if (instrumentType === 'uprightbass') {
            // Upright/Double Bass for jazz
            instrument = new Tone.MonoSynth({
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 0.3 },
                filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.2, baseFrequency: 100, octaves: 1.5 }
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -6;
        } else if (instrumentType === 'square') {
            // Square wave lead for chiptune/retro sounds (Pokémon style)
            instrument = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'square' },
                envelope: { attack: 0.005, decay: 0.1, sustain: 0.4, release: 0.1 }
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -8;
        } else if (instrumentType === 'pwmbass') {
            // PWM Bass for deep warm bass lines (Pokémon style)
            instrument = new Tone.MonoSynth({
                oscillator: { type: 'pwm', modulationFrequency: 2 },
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.2 },
                filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.1, baseFrequency: 150, octaves: 2.5 }
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -8;
        } else if (instrumentType === 'bell') {
            // Metallic bell sound for bright melodies (Pokémon style)
            instrument = new Tone.PolySynth(Tone.MetalSynth, {
                frequency: 200,
                envelope: { attack: 0.001, decay: 0.4, release: 0.8 },
                harmonicity: 8,
                modulationIndex: 20,
                resonance: 4000,
                octaves: 1.5
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -12;
        } else if (instrumentType === 'strings') {
            // Orchestral string pad (Pokémon style)
            instrument = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'sawtooth' },
                envelope: { attack: 0.3, decay: 0.4, sustain: 0.7, release: 1.5 }
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -14;
        } else if (instrumentType === 'brass') {
            // Punchy brass sound (Pokémon style)
            instrument = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'sawtooth' },
                envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.3 }
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -10;
        } else if (instrumentType === 'pizzicato') {
            // Plucked string sound (Pokémon style)
            instrument = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.001, decay: 0.08, sustain: 0.0, release: 0.1 }
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -8;
        } else if (instrumentType === 'marimba') {
            // Wooden mallet percussion (Pokémon style)
            instrument = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.3, sustain: 0.0, release: 0.4 }
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -10;
        } else if (instrumentType === 'flute') {
            // Soft airy flute (Pokémon style)
            instrument = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.3 }
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -12;
        } else if (instrumentType === 'pad') {
            instrument = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'sine' },
                envelope: { attack: 0.8, decay: 0.5, sustain: 0.8, release: 2.0 }
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -15;
        } else if (instrumentType === 'pluck') {
            // MonoSynth configured to sound like a plucked string
            instrument = new Tone.MonoSynth({
                oscillator: { type: 'sawtooth' },
                envelope: { attack: 0.001, decay: 0.1, sustain: 0.0, release: 0.2 },
                filterEnvelope: { attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.2, baseFrequency: 2000, octaves: 2.5 }
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -10;
        } else {
            // Default synth
            instrument = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: waveType },
                envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 }
            }).toDestination();
            if (this.audioManager.getMediaStreamDestination()) instrument.connect(this.audioManager.getMediaStreamDestination());
            instrument.volume.value = -10;
        }
        
        const channel = { 
            id, 
            name, 
            synth: instrument, 
            instrumentType,
            waveType, 
            volume: 0.7, 
            muted: false, 
            attack: 10, 
            release: 200,
            pattern: Array(this.getTotalSteps()).fill(null).map(() => ({})) // Dynamic pattern size
        };
        this.channels.push(channel);
        
        this.selectChannel(id);
        return channel;
    }

    selectChannel(id) {
        // Edge case: Validate channel exists
        const channel = this.channels.find(ch => ch.id === id);
        if (!channel) {
            console.warn('Channel not found:', id);
            return;
        }
        
        this.selectedChannelId = id;
    }

    getSelectedChannel() {
        const channel = this.channels.find(ch => ch.id === this.selectedChannelId);
        // Edge case: If selected channel doesn't exist, select the first one
        if (!channel && this.channels.length > 0) {
            this.selectedChannelId = this.channels[0].id;
            return this.channels[0];
        }
        return channel;
    }

    removeChannel(id) {
        const index = this.channels.findIndex(ch => ch.id === id);
        if (index === -1) return;
        
        const channel = this.channels[index];
        
        try {
            // Release all notes before disposing
            if (channel.instrumentType === 'drums') {
                // For drums, stop all active sounds
                if (channel.synth.kick) channel.synth.kick.triggerRelease();
                if (channel.synth.snare && channel.synth.snare.noise) {
                    channel.synth.snare.noise.stop();
                }
                if (channel.synth.hihat && channel.synth.hihat.noise) {
                    channel.synth.hihat.noise.stop();
                }
                if (channel.synth.clap && channel.synth.clap.noise) {
                    channel.synth.clap.noise.stop();
                }
            } else {
                // For melodic instruments, release all notes
                if (channel.synth && channel.synth.releaseAll) {
                    channel.synth.releaseAll();
                }
            }
            
            // Small delay to allow notes to release
            setTimeout(() => {
                // Dispose instruments properly based on type
                if (channel.instrumentType === 'drums') {
                    // Drums have multiple synths
                    if (channel.synth.kick) channel.synth.kick.dispose();
                    if (channel.synth.snare) channel.synth.snare.dispose();
                    if (channel.synth.hihat) channel.synth.hihat.dispose();
                    if (channel.synth.clap) channel.synth.clap.dispose();
                } else {
                    // Regular instruments have a single synth
                    if (channel.synth) channel.synth.dispose();
                }
            }, 50);
        } catch (error) {
            console.error('Error disposing instrument:', error);
        }
        
        this.channels.splice(index, 1);
        if (this.selectedChannelId === id && this.channels.length > 0) {
            this.selectedChannelId = this.channels[0].id;
        } else if (this.channels.length === 0) {
            this.selectedChannelId = null;
        }
    }

    updateChannel(id, property, value) {
        const channel = this.channels.find(ch => ch.id === id);
        if (!channel) return;
        
        // Edge case: Validate volume range
        if (property === 'volume') {
            value = Math.max(0, Math.min(1, value));
        }
        
        channel[property] = value;
        
        if (channel.instrumentType === 'drums') {
            // Handle drum channels differently
            if (property === 'volume') {
                const volumeValue = -20 + (value * 20);
                channel.synth.kick.volume.value = volumeValue;
                channel.synth.snare.volume.value = volumeValue;
                channel.synth.hihat.volume.value = volumeValue;
                channel.synth.clap.volume.value = volumeValue;
            } else if (property === 'muted') {
                const volumeValue = value ? -Infinity : -20 + (channel.volume * 20);
                channel.synth.kick.volume.value = volumeValue;
                channel.synth.snare.volume.value = volumeValue;
                channel.synth.hihat.volume.value = volumeValue;
                channel.synth.clap.volume.value = volumeValue;
            }
        } else {
            // Handle regular instrument channels
            if (property === 'waveType') {
                // Update the waveType for synths
                if (channel.instrumentType === 'synth' || channel.instrumentType === 'pad') {
                    channel.synth.set({ oscillator: { type: value } });
                }
            } else if (property === 'volume') {
                channel.synth.volume.value = -20 + (value * 20);
            } else if (property === 'muted') {
                channel.synth.volume.value = value ? -Infinity : -20 + (channel.volume * 20);
            } else if (property === 'attack' || property === 'release') {
                // Only update envelope for instruments that support it (not FM synths, pluck, or special instruments)
                const supportsEnvelope = ['synth', 'bass', 'pad', 'pluck', 'acidbass', 'uprightbass', 'pwmbass', 'square', 'strings', 'brass', 'pizzicato', 'marimba', 'flute'].includes(channel.instrumentType);
                if (supportsEnvelope && channel.synth.envelope) {
                    try {
                        channel.synth.set({ envelope: { attack: channel.attack / 1000, release: channel.release / 1000 } });
                    } catch (error) {
                        console.warn('Could not update envelope for', channel.instrumentType);
                    }
                }
            }
        }
    }

    playNote(channel, note, time = undefined) {
        if (!channel || channel.muted || channel.instrumentType === 'drums') {
            return;
        }
        
        try {
            if (channel.instrumentType === 'bass' || channel.instrumentType === 'acidbass' || channel.instrumentType === 'uprightbass' || channel.instrumentType === 'pwmbass') {
                // Mono synths for bass sounds
                channel.synth.triggerAttackRelease(note, '8n', time);
            } else if (channel.instrumentType === 'pluck' || channel.instrumentType === 'pizzicato') {
                // Pluck needs a different duration for proper sound
                channel.synth.triggerAttackRelease(note, '4n', time);
            } else if (channel.instrumentType === 'fmsynth') {
                // FM synth with shorter duration for punchier sound
                channel.synth.triggerAttackRelease(note, '16n', time);
            } else if (channel.instrumentType === 'epiano') {
                // Electric piano with medium sustain
                channel.synth.triggerAttackRelease(note, '4n', time);
            } else if (channel.instrumentType === 'vibraphone') {
                // Vibraphone with long sustain
                channel.synth.triggerAttackRelease(note, '2n', time);
            } else if (channel.instrumentType === 'bell' || channel.instrumentType === 'marimba') {
                // Bell and marimba with medium-long sustain
                channel.synth.triggerAttackRelease(note, '4n', time);
            } else if (channel.instrumentType === 'strings' || channel.instrumentType === 'brass') {
                // Strings and brass with longer sustain
                channel.synth.triggerAttackRelease(note, '2n', time);
            } else if (channel.instrumentType === 'flute') {
                // Flute with medium sustain
                channel.synth.triggerAttackRelease(note, '4n', time);
            } else if (channel.instrumentType === 'square') {
                // Square wave lead for chiptune
                channel.synth.triggerAttackRelease(note, '8n', time);
            } else {
                // Default synths and pads
                channel.synth.triggerAttackRelease(note, '8n', time);
            }
        } catch (error) {
            console.error('Error playing note:', error);
        }
    }

    playDrum(channel, drumType, time = undefined) {
        if (!channel || channel.muted || channel.instrumentType !== 'drums') return;
        
        try {
            switch(drumType) {
                case 'kick':
                    channel.synth.kick.triggerAttackRelease('C1', '8n', time);
                    break;
                case 'snare':
                    channel.synth.snare.triggerAttack(time);
                    break;
                case 'hihat':
                    channel.synth.hihat.triggerAttackRelease('16n', time);
                    break;
                case 'clap':
                    channel.synth.clap.triggerAttack(time);
                    break;
            }
        } catch (error) {
            console.error('Error playing drum:', error);
        }
    }

    releaseAllNotes() {
        // Release all active notes from all instruments to prevent stuck notes
        this.channels.forEach(channel => {
            if (channel && channel.synth) {
                try {
                    if (channel.instrumentType === 'drums') {
                        // For drums, just stop the synths
                        if (channel.synth.kick) channel.synth.kick.triggerRelease();
                        if (channel.synth.snare && channel.synth.snare.noise) {
                            channel.synth.snare.noise.stop();
                        }
                        if (channel.synth.hihat && channel.synth.hihat.noise) {
                            channel.synth.hihat.noise.stop();
                        }
                        if (channel.synth.clap && channel.synth.clap.noise) {
                            channel.synth.clap.noise.stop();
                        }
                    } else {
                        // For melodic instruments, release all notes
                        channel.synth.releaseAll();
                    }
                } catch (error) {
                    console.error('Error releasing notes for channel:', channel.name, error);
                }
            }
        });
    }

    getChannels() {
        return this.channels;
    }

    getSelectedChannelId() {
        return this.selectedChannelId;
    }

    setSelectedChannelId(id) {
        this.selectedChannelId = id;
    }

    getTotalSteps() {
        // This will be set by the sequencer module
        return window.sequencer ? window.sequencer.getTotalSteps() : 16;
    }
}

// Export for use in other modules
window.ChannelManager = ChannelManager;
