// PRESETS MODULE - Contains all preset patterns and configurations
class PresetManager {
    constructor(channelManager, sequencer) {
        this.channelManager = channelManager;
        this.sequencer = sequencer;
    }

    loadPreset(presetName) {
        // Stop playback immediately - use same method as export
        const wasPlaying = this.sequencer.getIsPlaying();
        if (wasPlaying) {
            Tone.Transport.stop();
            Tone.Transport.cancel(); // Cancel all scheduled events immediately
            this.sequencer.stopSequencer();
            this.sequencer.isPlaying = false;
            this.channelManager.releaseAllNotes();
        }
        
        // Also force stop any stuck notes by silencing all synths
        this.channelManager.getChannels().forEach(channel => {
            if (channel.synth) {
                try {
                    if (channel.synth.volume) {
                        channel.synth.volume.value = -Infinity;
                    }
                } catch (e) {
                    // Ignore errors
                }
            }
        });

        // Clear existing channels
        const channels = [...this.channelManager.getChannels()];
        channels.forEach(ch => {
            this.channelManager.removeChannel(ch.id);
        });

        // Load the selected preset
        switch(presetName) {
            case 'demo':
                this.loadDemoPreset();
                break;
            case 'techno':
                this.loadTechnoPreset();
                break;
            case 'lofi':
                this.loadLofiPreset();
                break;
            case 'dubstep':
                this.loadDubstepPreset();
                break;
            case 'house':
                this.loadHousePreset();
                break;
            case 'ambient':
                this.loadAmbientPreset();
                break;
            case 'dnb':
                this.loadDnBPreset();
                break;
            case 'game':
                this.loadgamePreset();
                break;
            case 'trap':
                this.loadTrapPreset();
                break;
            case 'synthwave':
                this.loadSynthwavePreset();
                break;
            case 'futurebass':
                this.loadFutureBassPreset();
                break;
            default:
                return;
        }

        // Re-render UI
        if (window.app && window.app.uiManager) {
            requestAnimationFrame(() => {
                window.app.uiManager.renderChannels();
                window.app.uiManager.renderMixerChannels();
                window.app.uiManager.renderSequencerGrid();
            });
        }
    }

    createDemoSetup() {
        // Add demo channels with cooler instruments
        const drums = this.channelManager.addChannel('🥁 Drums', 'drums', 'sine');
        const bass = this.channelManager.addChannel('🔊 Bass', 'bass', 'sine');
        const lead = this.channelManager.addChannel('✨ Lead', 'synth', 'sawtooth');
        const pad = this.channelManager.addChannel('🌊 Pad', 'pad', 'sine');
        
        // Create an energetic demo pattern for 1 bar (16 steps)
        // Drums - groovy pattern with syncopation
        if (drums) {
            // Kick - four on the floor with variation
            drums.pattern[0] = { kick: true };
            drums.pattern[4] = { kick: true };
            drums.pattern[8] = { kick: true };
            drums.pattern[12] = { kick: true };
            
            // Snare on 2 and 4 with ghost notes
            drums.pattern[4] = { ...drums.pattern[4], snare: true };
            drums.pattern[10] = { snare: true }; // Ghost snare
            drums.pattern[12] = { ...drums.pattern[12], snare: true };
            
            // Hihat - 16th notes with accents
            for (let i = 0; i < 16; i++) {
                if (!drums.pattern[i]) drums.pattern[i] = {};
                drums.pattern[i].hihat = true;
            }
            
            // Claps for extra groove
            drums.pattern[4] = { ...drums.pattern[4], clap: true };
            drums.pattern[12] = { ...drums.pattern[12], clap: true };
        }
        
        // Bass - funky syncopated bassline
        if (bass) {
            bass.pattern[0] = { C3: true };
            bass.pattern[2] = { C3: true };
            bass.pattern[4] = { 'D#3': true };
            bass.pattern[6] = { 'D#3': true };
            bass.pattern[8] = { F3: true };
            bass.pattern[10] = { 'D#3': true };
            bass.pattern[12] = { C3: true };
            bass.pattern[14] = { G3: true };
        }
        
        // Lead - catchy arpeggiated melody
        if (lead) {
            lead.pattern[0] = { C4: true };
            lead.pattern[1] = { 'D#4': true };
            lead.pattern[2] = { G4: true };
            lead.pattern[3] = { C5: true };
            lead.pattern[4] = { G4: true };
            lead.pattern[5] = { 'D#4': true };
            lead.pattern[6] = { C4: true };
            lead.pattern[8] = { F4: true };
            lead.pattern[9] = { 'G#4': true };
            lead.pattern[10] = { C5: true };
            lead.pattern[11] = { 'D#5': true };
            lead.pattern[12] = { C5: true };
            lead.pattern[13] = { 'G#4': true };
            lead.pattern[14] = { F4: true };
        }
        
        // Pad - atmospheric chords
        if (pad) {
            pad.pattern[0] = { C4: true, 'D#4': true, G4: true }; // Cm chord
            pad.pattern[8] = { F4: true, 'G#4': true, C5: true }; // Fm chord
        }
        
        // Select the lead channel by default so users can immediately see patterns
        if (lead) {
            this.channelManager.selectChannel(lead.id);
        }

        return { drums, bass, lead, pad };
    }

    loadDemoPreset() {
        // Set grid to 16 steps, 1 bar for demo
        this.sequencer.setGridSize(16);
        this.sequencer.setBarCount(1);
        
        // Update bars select dropdown
        const barsSelect = document.getElementById('barsSelect');
        if (barsSelect) {
            barsSelect.value = '1';
        }
        
        // This is the same as createDemoSetup but without the welcome message
        const drums = this.channelManager.addChannel('🥁 Drums', 'drums', 'sine');
        const bass = this.channelManager.addChannel('🔊 Bass', 'bass', 'sine');
        const lead = this.channelManager.addChannel('✨ Lead', 'synth', 'sawtooth');
        const pad = this.channelManager.addChannel('🌊 Pad', 'pad', 'sine');
        
        if (drums) {
            drums.pattern[0] = { kick: true };
            drums.pattern[4] = { kick: true, snare: true, clap: true };
            drums.pattern[8] = { kick: true };
            drums.pattern[10] = { snare: true };
            drums.pattern[12] = { kick: true, snare: true, clap: true };
            for (let i = 0; i < 16; i++) {
                if (!drums.pattern[i]) drums.pattern[i] = {};
                drums.pattern[i].hihat = true;
            }
        }
        
        if (bass) {
            bass.pattern[0] = { C3: true };
            bass.pattern[2] = { C3: true };
            bass.pattern[4] = { 'D#3': true };
            bass.pattern[6] = { 'D#3': true };
            bass.pattern[8] = { F3: true };
            bass.pattern[10] = { 'D#3': true };
            bass.pattern[12] = { C3: true };
            bass.pattern[14] = { G3: true };
        }
        
        if (lead) {
            lead.pattern[0] = { C4: true };
            lead.pattern[1] = { 'D#4': true };
            lead.pattern[2] = { G4: true };
            lead.pattern[3] = { C5: true };
            lead.pattern[4] = { G4: true };
            lead.pattern[5] = { 'D#4': true };
            lead.pattern[6] = { C4: true };
            lead.pattern[8] = { F4: true };
            lead.pattern[9] = { 'G#4': true };
            lead.pattern[10] = { C5: true };
            lead.pattern[11] = { 'D#5': true };
            lead.pattern[12] = { C5: true };
            lead.pattern[13] = { 'G#4': true };
            lead.pattern[14] = { F4: true };
        }
        
        if (pad) {
            pad.pattern[0] = { C4: true, 'D#4': true, G4: true };
            pad.pattern[8] = { F4: true, 'G#4': true, C5: true };
        }
        
        if (lead) this.channelManager.selectChannel(lead.id);
    }

    loadTechnoPreset() {
        // Set grid to 16 steps, 1 bar
        this.sequencer.setGridSize(16);
        this.sequencer.setBarCount(1);
        
        // Update bars select dropdown
        const barsSelect = document.getElementById('barsSelect');
        if (barsSelect) {
            barsSelect.value = '1';
        }
        
        const drums = this.channelManager.addChannel('🥁 Techno Drums', 'drums', 'sine');
        const bass = this.channelManager.addChannel('🔊 Acid Bass', 'acidbass', 'sine');
        const lead = this.channelManager.addChannel('⚡ FM Lead', 'fmsynth', 'sine');
        
        if (drums) {
            // Four on the floor kick
            for (let i = 0; i < 16; i += 4) {
                drums.pattern[i] = { kick: true };
            }
            // Off-beat hihat
            for (let i = 2; i < 16; i += 4) {
                drums.pattern[i] = { hihat: true };
            }
            // Snare on 2 and 4
            drums.pattern[4] = { ...drums.pattern[4], snare: true };
            drums.pattern[12] = { ...drums.pattern[12], snare: true };
        }
        
        if (bass) {
            // Acid bassline
            bass.pattern[0] = { C3: true };
            bass.pattern[3] = { C3: true };
            bass.pattern[6] = { 'D#3': true };
            bass.pattern[9] = { F3: true };
            bass.pattern[12] = { 'G#3': true };
            bass.pattern[14] = { G3: true };
        }
        
        if (lead) {
            // Aggressive stabs
            lead.pattern[4] = { C5: true };
            lead.pattern[6] = { 'D#5': true };
            lead.pattern[12] = { 'D#5': true };
        }
        
        if (drums) this.channelManager.selectChannel(drums.id);
    }

    loadLofiPreset() {
        // Set grid to 16 steps, 1 bar
        this.sequencer.setGridSize(16);
        this.sequencer.setBarCount(1);
        
        // Update bars select dropdown
        const barsSelect = document.getElementById('barsSelect');
        if (barsSelect) {
            barsSelect.value = '1';
        }
        
        const drums = this.channelManager.addChannel('🥁 Lo-fi Drums', 'drums', 'sine');
        const bass = this.channelManager.addChannel('🎸 Upright Bass', 'uprightbass', 'sine');
        const keys = this.channelManager.addChannel('🎹 E-Piano', 'epiano', 'sine');
        const vibe = this.channelManager.addChannel('🎵 Vibraphone', 'vibraphone', 'sine');
        
        if (drums) {
            // Laid back beat
            drums.pattern[0] = { kick: true };
            drums.pattern[6] = { snare: true };
            drums.pattern[8] = { kick: true };
            drums.pattern[14] = { snare: true };
            // Shuffled hihat
            drums.pattern[0] = { ...drums.pattern[0], hihat: true };
            drums.pattern[3] = { hihat: true };
            drums.pattern[6] = { ...drums.pattern[6], hihat: true };
            drums.pattern[9] = { hihat: true };
            drums.pattern[12] = { hihat: true };
        }
        
        if (bass) {
            // Walking bassline
            bass.pattern[0] = { E3: true };
            bass.pattern[4] = { A3: true };
            bass.pattern[8] = { D3: true };
            bass.pattern[12] = { G3: true };
        }
        
        if (keys) {
            // Jazzy chords
            keys.pattern[0] = { E4: true, 'G#4': true, B4: true }; // E major
            keys.pattern[8] = { D4: true, 'F#4': true, A4: true }; // D major
        }
        
        if (vibe) {
            // Melodic embellishment
            vibe.pattern[2] = { B4: true };
            vibe.pattern[5] = { 'C#5': true };
            vibe.pattern[10] = { A4: true };
            vibe.pattern[13] = { 'F#4': true };
        }
        
        if (keys) this.channelManager.selectChannel(keys.id);
    }

    loadDubstepPreset() {
        // Set grid to 16 steps, 1 bar
        this.sequencer.setGridSize(16);
        this.sequencer.setBarCount(1);
        
        // Update bars select dropdown
        const barsSelect = document.getElementById('barsSelect');
        if (barsSelect) {
            barsSelect.value = '1';
        }
        
        const drums = this.channelManager.addChannel('🥁 Heavy Drums', 'drums', 'sine');
        const bass = this.channelManager.addChannel('💥 Wobble Bass', 'bass', 'sine');
        const lead = this.channelManager.addChannel('⚡ Synth Lead', 'fmsynth', 'sine');
        
        if (drums) {
            // Half-time drums
            drums.pattern[0] = { kick: true };
            drums.pattern[8] = { kick: true, snare: true };
            // Complex hihat pattern
            for (let i = 0; i < 16; i += 2) {
                drums.pattern[i] = { ...drums.pattern[i], hihat: true };
            }
            drums.pattern[4] = { ...drums.pattern[4], clap: true };
            drums.pattern[12] = { ...drums.pattern[12], clap: true };
        }
        
        if (bass) {
            // Wobble pattern
            bass.pattern[0] = { E3: true };
            bass.pattern[1] = { E3: true };
            bass.pattern[2] = { F3: true };
            bass.pattern[3] = { E3: true };
            bass.pattern[8] = { G3: true };
            bass.pattern[9] = { G3: true };
            bass.pattern[10] = { 'G#3': true };
            bass.pattern[11] = { G3: true };
        }
        
        if (lead) {
            // Aggressive lead hits
            lead.pattern[4] = { C5: true, 'D#5': true };
            lead.pattern[12] = { 'D#5': true };
        }
        
        if (bass) this.channelManager.selectChannel(bass.id);
    }

    loadHousePreset() {
        // Set grid to 16 steps, 1 bar
        this.sequencer.setGridSize(16);
        this.sequencer.setBarCount(1);
        
        // Update bars select dropdown
        const barsSelect = document.getElementById('barsSelect');
        if (barsSelect) {
            barsSelect.value = '1';
        }
        
        const drums = this.channelManager.addChannel('🥁 House Drums', 'drums', 'sine');
        const bass = this.channelManager.addChannel('🔊 Deep Bass', 'bass', 'sine');
        const pad = this.channelManager.addChannel('🌊 Warm Pad', 'pad', 'sine');
        const pluck = this.channelManager.addChannel('🎸 Pluck', 'pluck', 'sine');
        
        if (drums) {
            // Four on the floor
            for (let i = 0; i < 16; i += 4) {
                drums.pattern[i] = { kick: true };
            }
            // Open hihat pattern
            for (let i = 0; i < 16; i += 2) {
                drums.pattern[i] = { ...drums.pattern[i], hihat: true };
            }
            // Claps on 2 and 4
            drums.pattern[4] = { ...drums.pattern[4], clap: true };
            drums.pattern[12] = { ...drums.pattern[12], clap: true };
        }
        
        if (bass) {
            // Pumping bassline
            bass.pattern[0] = { A3: true };
            bass.pattern[8] = { F3: true };
        }
        
        if (pad) {
            // Warm chords
            pad.pattern[0] = { A3: true, C4: true, E4: true }; // Am
            pad.pattern[8] = { F3: true, A3: true, C4: true }; // F
        }
        
        if (pluck) {
            // Melodic plucks
            pluck.pattern[2] = { E4: true };
            pluck.pattern[5] = { A4: true };
            pluck.pattern[10] = { C5: true };
            pluck.pattern[13] = { 'D#5': true };
        }
        
        if (pad) this.channelManager.selectChannel(pad.id);
    }

    loadAmbientPreset() {
        // Set grid to 16 steps, 1 bar
        this.sequencer.setGridSize(16);
        this.sequencer.setBarCount(1);
        
        // Update bars select dropdown
        const barsSelect = document.getElementById('barsSelect');
        if (barsSelect) {
            barsSelect.value = '1';
        }
        
        const pad1 = this.channelManager.addChannel('🌊 Deep Pad', 'pad', 'sine');
        const pad2 = this.channelManager.addChannel('✨ Bright Pad', 'pad', 'triangle');
        const vibe = this.channelManager.addChannel('🎵 Vibraphone', 'vibraphone', 'sine');
        
        if (pad1) {
            // Long sustained chords
            pad1.pattern[0] = { C3: true, E3: true, G3: true };
            pad1.pattern[8] = { D3: true, 'F#3': true, A3: true };
        }
        
        if (pad2) {
            // Higher voicing
            pad2.pattern[0] = { G4: true, C5: true, 'D#5': true };
            pad2.pattern[8] = { A4: true, D5: true, 'F#5': true };
        }
        
        if (vibe) {
            // Sparse melodic notes
            vibe.pattern[4] = { 'D#5': true };
            vibe.pattern[9] = { 'D#5': true };
            vibe.pattern[14] = { C5: true };
        }
        
        if (pad1) this.channelManager.selectChannel(pad1.id);
    }

    loadDnBPreset() {
        // Set grid to 16 steps, 1 bar
        this.sequencer.setGridSize(16);
        this.sequencer.setBarCount(1);
        
        // Update bars select dropdown
        const barsSelect = document.getElementById('barsSelect');
        if (barsSelect) {
            barsSelect.value = '1';
        }
        
        const drums = this.channelManager.addChannel('🥁 DnB Drums', 'drums', 'sine');
        const bass = this.channelManager.addChannel('🔊 Reese Bass', 'bass', 'sine');
        const lead = this.channelManager.addChannel('⚡ Amen Break', 'synth', 'sawtooth');
        
        if (drums) {
            // Fast breakbeat pattern
            drums.pattern[0] = { kick: true };
            drums.pattern[2] = { snare: true };
            drums.pattern[4] = { kick: true };
            drums.pattern[6] = { snare: true };
            drums.pattern[8] = { kick: true };
            drums.pattern[10] = { snare: true };
            drums.pattern[12] = { kick: true };
            drums.pattern[14] = { snare: true };
            // Rapid hihat
            for (let i = 0; i < 16; i++) {
                drums.pattern[i] = { ...drums.pattern[i], hihat: true };
            }
        }
        
        if (bass) {
            // Deep rolling bassline
            bass.pattern[0] = { 'D#3': true };
            bass.pattern[3] = { E3: true };
            bass.pattern[6] = { F3: true };
            bass.pattern[8] = { 'F#3': true };
            bass.pattern[11] = { F3: true };
            bass.pattern[14] = { E3: true };
        }
        
        if (lead) {
            // Stab hits
            lead.pattern[4] = { 'A#4': true };
            lead.pattern[12] = { 'D#5': true };
        }
        
        if (drums) this.channelManager.selectChannel(drums.id);
    }

    loadgamePreset() {
        // Set grid to 16 steps, 2 bars for Game style melody
        this.sequencer.setGridSize(16);
        this.sequencer.setBarCount(2);
        
        // Update bars select dropdown
        const barsSelect = document.getElementById('barsSelect');
        if (barsSelect) {
            barsSelect.value = '2';
        }
        
        // Create Game-style instruments
        const square = this.channelManager.addChannel('🎵 Square Lead', 'square', 'square');
        const pwmbass = this.channelManager.addChannel('🔉 PWM Bass', 'pwmbass', 'pwm');
        const bell = this.channelManager.addChannel('🔔 Bell', 'bell', 'sine');
        const strings = this.channelManager.addChannel('🎻 Strings', 'strings', 'sawtooth');
        const pizzicato = this.channelManager.addChannel('🎸 Pizzicato', 'pizzicato', 'triangle');
        
        // Square wave melody (main theme-like melody, 2 bars)
        if (square) {
            // Bar 1
            square.pattern[0] = { E4: true };
            square.pattern[2] = { 'G#4': true };
            square.pattern[4] = { B4: true };
            square.pattern[6] = { 'C#5': true };
            square.pattern[8] = { B4: true };
            square.pattern[10] = { 'G#4': true };
            square.pattern[12] = { E4: true };
            square.pattern[14] = { 'G#4': true };
            // Bar 2
            square.pattern[16] = { A4: true };
            square.pattern[18] = { 'C#5': true };
            square.pattern[20] = { 'D#5': true };
            square.pattern[22] = { 'C#5': true };
            square.pattern[24] = { A4: true };
            square.pattern[26] = { 'G#4': true };
            square.pattern[28] = { 'F#4': true };
            square.pattern[30] = { E4: true };
        }
        
        // PWM Bass (warm bass foundation)
        if (pwmbass) {
            // Bar 1
            pwmbass.pattern[0] = { E3: true };
            pwmbass.pattern[4] = { E3: true };
            pwmbass.pattern[8] = { E3: true };
            pwmbass.pattern[12] = { E3: true };
            // Bar 2
            pwmbass.pattern[16] = { A3: true };
            pwmbass.pattern[20] = { A3: true };
            pwmbass.pattern[24] = { A3: true };
            pwmbass.pattern[28] = { E3: true };
        }
        
        // Bell harmony (bright accents)
        if (bell) {
            // Bar 1
            bell.pattern[4] = { B4: true };
            bell.pattern[12] = { 'G#4': true };
            // Bar 2
            bell.pattern[20] = { 'D#5': true };
            bell.pattern[28] = { 'F#4': true };
        }
        
        // String pad (orchestral background)
        if (strings) {
            // Sustained chords
            // Bar 1 - E major chord
            strings.pattern[0] = { E3: true, 'G#3': true, B3: true };
            strings.pattern[8] = { E3: true, 'G#3': true, B3: true };
            // Bar 2 - A major then F# minor
            strings.pattern[16] = { A3: true, 'C#4': true, E4: true };
            strings.pattern[24] = { 'F#3': true, A3: true, 'C#4': true };
        }
        
        // Pizzicato (plucked accent notes)
        if (pizzicato) {
            // Bar 1
            pizzicato.pattern[2] = { B3: true };
            pizzicato.pattern[6] = { 'C#4': true };
            pizzicato.pattern[10] = { B3: true };
            pizzicato.pattern[14] = { 'G#3': true };
            // Bar 2
            pizzicato.pattern[18] = { 'C#4': true };
            pizzicato.pattern[22] = { E4: true };
            pizzicato.pattern[26] = { A3: true };
            pizzicato.pattern[30] = { 'G#3': true };
        }
        
        if (square) this.channelManager.selectChannel(square.id);
    }

    loadTrapPreset() {
        // Trap music preset with 808 bass, hi-hat rolls, and snare patterns
        this.sequencer.setGridSize(16);
        this.sequencer.setBarCount(2);
        this.sequencer.setTempo(140);
        
        const barsSelect = document.getElementById('barsSelect');
        if (barsSelect) barsSelect.value = '2';
        
        const tempoInput = document.getElementById('tempoInput');
        if (tempoInput) tempoInput.value = 140;
        
        // Add 808-style drums
        const drums = this.channelManager.addChannel('Trap Drums', 'drums');
        
        // Add Reese bass for deep sub-bass
        const bass = this.channelManager.addChannel('808 Bass', 'reesebass');
        
        // Add synth lead
        const lead = this.channelManager.addChannel('Trap Lead', 'fmsynth');
        
        // Add pad for atmosphere
        const pad = this.channelManager.addChannel('Atmos Pad', 'pad');
        
        // Drums pattern - Trap style
        if (drums) {
            // Kick pattern (808 style)
            for (let bar = 0; bar < 2; bar++) {
                const offset = bar * 16;
                drums.pattern[offset + 0] = { kick: true };
                drums.pattern[offset + 6] = { kick: true };
                drums.pattern[offset + 12] = { kick: true };
            }
            
            // Snare on 2 and 4
            for (let bar = 0; bar < 2; bar++) {
                const offset = bar * 16;
                drums.pattern[offset + 4] = { snare: true };
                drums.pattern[offset + 12] = { snare: true };
            }
            
            // Hi-hat rolls (trap style)
            for (let bar = 0; bar < 2; bar++) {
                const offset = bar * 16;
                for (let i = 0; i < 16; i++) {
                    if (i % 2 === 0) {
                        if (!drums.pattern[offset + i]) drums.pattern[offset + i] = {};
                        drums.pattern[offset + i].hihat = true;
                    }
                }
                // Extra roll at end of bar
                drums.pattern[offset + 13] = { ...drums.pattern[offset + 13], hihat: true };
                drums.pattern[offset + 14] = { ...drums.pattern[offset + 14], hihat: true };
                drums.pattern[offset + 15] = { ...drums.pattern[offset + 15], hihat: true };
            }
            
            // Clap accents
            drums.pattern[20] = { ...drums.pattern[20], clap: true };
            drums.pattern[28] = { ...drums.pattern[28], clap: true };
        }
        
        // 808 Bass pattern
        if (bass) {
            bass.pattern[0] = { C3: true };
            bass.pattern[6] = { C3: true };
            bass.pattern[12] = { 'D#3': true };
            bass.pattern[16] = { 'G#3': true };
            bass.pattern[22] = { 'G#3': true };
            bass.pattern[28] = { C3: true };
        }
        
        // Lead pattern
        if (lead) {
            lead.pattern[4] = { C5: true };
            lead.pattern[8] = { 'D#5': true };
            lead.pattern[12] = { 'D#5': true };
            lead.pattern[20] = { 'D#5': true };
            lead.pattern[24] = { 'D#5': true };
            lead.pattern[28] = { C5: true };
        }
        
        // Pad (atmospheric)
        if (pad) {
            pad.pattern[0] = { C4: true, 'D#4': true, G4: true };
            pad.pattern[16] = { 'A#3': true, D4: true, F4: true };
        }
        
        if (drums) this.channelManager.selectChannel(drums.id);
    }

    loadSynthwavePreset() {
        // 80s Synthwave/Retrowave preset
        this.sequencer.setGridSize(16);
        this.sequencer.setBarCount(2);
        this.sequencer.setTempo(120);
        
        const barsSelect = document.getElementById('barsSelect');
        if (barsSelect) barsSelect.value = '2';
        
        const tempoInput = document.getElementById('tempoInput');
        if (tempoInput) tempoInput.value = 120;
        
        // Add drums
        const drums = this.channelManager.addChannel('80s Drums', 'drums');
        
        // Add supersaw lead (classic synthwave sound)
        const lead = this.channelManager.addChannel('Supersaw Lead', 'supersaw');
        
        // Add bass
        const bass = this.channelManager.addChannel('Synth Bass', 'bass');
        
        // Add pad for atmosphere
        const pad = this.channelManager.addChannel('Retro Pad', 'pad');
        
        // Add arp synth
        const arp = this.channelManager.addChannel('Arp Synth', 'pluck');
        
        // Drums - 80s style
        if (drums) {
            // Four-on-floor kick
            for (let bar = 0; bar < 2; bar++) {
                const offset = bar * 16;
                drums.pattern[offset + 0] = { kick: true };
                drums.pattern[offset + 4] = { kick: true };
                drums.pattern[offset + 8] = { kick: true };
                drums.pattern[offset + 12] = { kick: true };
            }
            
            // Snare on 2 and 4
            for (let bar = 0; bar < 2; bar++) {
                const offset = bar * 16;
                drums.pattern[offset + 4] = { ...drums.pattern[offset + 4], snare: true };
                drums.pattern[offset + 12] = { ...drums.pattern[offset + 12], snare: true };
            }
            
            // Hi-hats (16th notes)
            for (let bar = 0; bar < 2; bar++) {
                const offset = bar * 16;
                for (let i = 0; i < 16; i += 2) {
                    if (!drums.pattern[offset + i]) drums.pattern[offset + i] = {};
                    drums.pattern[offset + i].hihat = true;
                }
            }
        }
        
        // Supersaw lead - melodic
        if (lead) {
            lead.pattern[0] = { C5: true };
            lead.pattern[4] = { 'D#5': true };
            lead.pattern[8] = { 'D#5': true };
            lead.pattern[12] = { 'D#5': true };
            lead.pattern[16] = { 'D#5': true };
            lead.pattern[20] = { 'C5': true };
            lead.pattern[24] = { 'A#4': true };
            lead.pattern[28] = { 'C5': true };
        }
        
        // Bass - simple 80s bassline
        if (bass) {
            bass.pattern[0] = { C3: true };
            bass.pattern[4] = { C3: true };
            bass.pattern[8] = { 'D#3': true };
            bass.pattern[12] = { 'D#3': true };
            bass.pattern[16] = { 'G#3': true };
            bass.pattern[20] = { 'G#3': true };
            bass.pattern[24] = { C3: true };
            bass.pattern[28] = { C3: true };
        }
        
        // Pad - sustained chords
        if (pad) {
            pad.pattern[0] = { C4: true, 'D#4': true, G4: true };
            pad.pattern[16] = { 'A#3': true, D4: true, F4: true };
        }
        
        // Arp synth - 16th note arpeggios
        if (arp) {
            const notes = ['C4', 'D#4', 'G4', 'C5'];
            for (let bar = 0; bar < 2; bar++) {
                const offset = bar * 16;
                for (let i = 0; i < 16; i += 2) {
                    arp.pattern[offset + i] = { [notes[i % 4]]: true };
                }
            }
        }
        
        if (lead) this.channelManager.selectChannel(lead.id);
    }

    loadFutureBassPreset() {
        // Future Bass preset with melodic chords and wobble bass
        this.sequencer.setGridSize(16);
        this.sequencer.setBarCount(2);
        this.sequencer.setTempo(150);
        
        const barsSelect = document.getElementById('barsSelect');
        if (barsSelect) barsSelect.value = '2';
        
        const tempoInput = document.getElementById('tempoInput');
        if (tempoInput) tempoInput.value = 150;
        
        // Add drums
        const drums = this.channelManager.addChannel('FB Drums', 'drums');
        
        // Add wobble bass
        const bass = this.channelManager.addChannel('Wobble Bass', 'wobblebass');
        
        // Add supersaw for chords
        const chords = this.channelManager.addChannel('Future Chords', 'supersaw');
        
        // Add lead
        const lead = this.channelManager.addChannel('FB Lead', 'fmsynth');
        
        // Add pluck for melody
        const pluck = this.channelManager.addChannel('Pluck Melody', 'pluck');
        
        // Drums - future bass style
        if (drums) {
            // Kick pattern
            for (let bar = 0; bar < 2; bar++) {
                const offset = bar * 16;
                drums.pattern[offset + 0] = { kick: true };
                drums.pattern[offset + 8] = { kick: true };
            }
            
            // Snare
            for (let bar = 0; bar < 2; bar++) {
                const offset = bar * 16;
                drums.pattern[offset + 4] = { snare: true };
                drums.pattern[offset + 12] = { snare: true };
            }
            
            // Hi-hats (varied pattern)
            for (let bar = 0; bar < 2; bar++) {
                const offset = bar * 16;
                drums.pattern[offset + 2] = { hihat: true };
                drums.pattern[offset + 6] = { hihat: true };
                drums.pattern[offset + 10] = { hihat: true };
                drums.pattern[offset + 14] = { hihat: true };
            }
        }
        
        // Wobble bass
        if (bass) {
            bass.pattern[0] = { E3: true };
            bass.pattern[8] = { E3: true };
            bass.pattern[16] = { D3: true };
            bass.pattern[24] = { C3: true };
        }
        
        // Supersaw chords
        if (chords) {
            chords.pattern[0] = { E4: true, 'G#4': true, B4: true };
            chords.pattern[8] = { E4: true, 'G#4': true, B4: true };
            chords.pattern[16] = { D4: true, 'F#4': true, A4: true };
            chords.pattern[24] = { C4: true, E4: true, G4: true };
        }
        
        // Lead melody
        if (lead) {
            lead.pattern[4] = { B4: true };
            lead.pattern[8] = { 'G#4': true };
            lead.pattern[12] = { E4: true };
            lead.pattern[20] = { A4: true };
            lead.pattern[24] = { 'F#4': true };
            lead.pattern[28] = { E4: true };
        }
        
        // Pluck melody (arpeggiated)
        if (pluck) {
            const notes = ['E4', 'G#4', 'B4', 'D#5', 'B4', 'G#4'];
            for (let i = 0; i < 16; i += 3) {
                pluck.pattern[i] = { [notes[i % 6]]: true };
                pluck.pattern[16 + i] = { [notes[(i + 2) % 6]]: true };
            }
        }
        
        if (chords) this.channelManager.selectChannel(chords.id);
    }
}

// Export for use in other modules
window.PresetManager = PresetManager;
