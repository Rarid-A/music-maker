// UI MODULE - DOM manipulation and rendering
class UIManager {
    constructor(channelManager, sequencer) {
        this.channelManager = channelManager;
        this.sequencer = sequencer;
        this.keyboardMap = {'a':'C4','w':'C#4','s':'D4','e':'D#4','d':'E4','f':'F4','t':'F#4','g':'G4','y':'G#4','h':'A4','u':'A#4','j':'B4','k':'C5'};
    }

    renderChannels() {
        const channelsList = document.getElementById('channelsList');
        if (!channelsList) return;
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        this.channelManager.getChannels().forEach(channel => {
            const div = document.createElement('div');
            div.className = `channel-item ${channel.id === this.channelManager.getSelectedChannelId() ? 'selected' : ''}`;
            div.onclick = () => this.selectChannel(channel.id);
            
            // Get display name for instrument type
            const instrumentDisplayName = {
                'synth': 'Synth',
                'bass': 'Bass',
                'acidbass': 'Acid Bass',
                'fmsynth': 'FM Synth',
                'epiano': 'E-Piano',
                'vibraphone': 'Vibraphone',
                'uprightbass': 'Upright Bass',
                'pad': 'Pad',
                'pluck': 'Pluck',
                'drums': 'Drums'
            }[channel.instrumentType] || channel.instrumentType;
            
            // Show different settings based on instrument type
            const settingsHTML = channel.instrumentType === 'drums' ? `
                <div class="channel-settings">
                    <div class="setting-item" style="grid-column: 1 / -1;">
                        <label>Drums</label>
                        <div style="font-size: 0.75em; color: #888;">Kick, Snare, HiHat, Clap</div>
                    </div>
                </div>
            ` : (channel.instrumentType === 'acidbass' || channel.instrumentType === 'fmsynth') ? `
                <div class="channel-settings">
                    <div class="setting-item" style="grid-column: 1 / -1;">
                        <label>${instrumentDisplayName}</label>
                        <div style="font-size: 0.75em; color: #888;">
                            ${channel.instrumentType === 'acidbass' ? 'TB-303 style' : 'FM synthesis'}
                        </div>
                    </div>
                </div>
            ` : (channel.instrumentType === 'epiano' || channel.instrumentType === 'vibraphone' || channel.instrumentType === 'uprightbass') ? `
                <div class="channel-settings">
                    <div class="setting-item" style="grid-column: 1 / -1;">
                        <label>${instrumentDisplayName}</label>
                        <div style="font-size: 0.75em; color: #888;">Jazz/Acoustic</div>
                    </div>
                </div>
            ` : `
                <div class="channel-settings">
                    <div class="setting-item">
                        <label>Type</label>
                        <select onchange="window.app.updateChannel(${channel.id}, 'waveType', this.value)" onclick="event.stopPropagation()" ${(channel.instrumentType === 'synth' || channel.instrumentType === 'pad') ? '' : 'disabled'}>
                            <option value="sine" ${channel.waveType==='sine'?'selected':''}>Sine</option>
                            <option value="square" ${channel.waveType==='square'?'selected':''}>Square</option>
                            <option value="triangle" ${channel.waveType==='triangle'?'selected':''}>Triangle</option>
                            <option value="sawtooth" ${channel.waveType==='sawtooth'?'selected':''}>Saw</option>
                        </select>
                    </div>
                    <div class="setting-item">
                        <label>Attack</label>
                        <input type="range" min="0" max="500" value="${channel.attack}" step="10" 
                               onchange="window.app.updateChannel(${channel.id}, 'attack', parseInt(this.value))" onclick="event.stopPropagation()">
                    </div>
                </div>
            `;
            
            div.innerHTML = `
                <div class="channel-header">
                    <div class="channel-name-display">${channel.name} <span style="font-size:0.8em;color:#888;">[${instrumentDisplayName}]</span></div>
                    <button class="channel-btn" onclick="event.stopPropagation(); window.app.removeChannel(${channel.id})">✕</button>
                </div>
                ${settingsHTML}
            `;
            fragment.appendChild(div);
        });
        
        // Clear and append all at once
        channelsList.innerHTML = '';
        channelsList.appendChild(fragment);
    }

    renderMixerChannels() {
        const mixerChannels = document.getElementById('mixerChannels');
        if (!mixerChannels) return;
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        this.channelManager.getChannels().forEach(channel => {
            const div = document.createElement('div');
            div.className = 'mixer-channel';
            div.innerHTML = `
                <div class="channel-name">${channel.name}</div>
                <input type="range" class="volume-slider" min="0" max="1" value="${channel.volume}" step="0.01"
                       oninput="window.app.updateChannel(${channel.id}, 'volume', parseFloat(this.value))">
                <div class="volume-label">${Math.round(channel.volume*100)}%</div>
                <div class="mixer-controls">
                    <button class="mixer-btn ${channel.muted?'active':''}" 
                            onclick="window.app.updateChannel(${channel.id}, 'muted', !${channel.muted})">M</button>
                </div>
            `;
            fragment.appendChild(div);
        });
        
        // Clear and append all at once
        mixerChannels.innerHTML = '';
        mixerChannels.appendChild(fragment);
    }

    renderSequencerGrid() {
        const grid = document.getElementById('sequencerGrid');
        if (!grid) return;
        
        const channel = this.channelManager.getSelectedChannel();
        if (!channel) {
            document.getElementById('selectedChannelName').textContent = 'None';
            grid.innerHTML = '<div style="color: #888; padding: 20px; text-align: center;">Select a channel to edit patterns</div>';
            return;
        }
        
        document.getElementById('selectedChannelName').textContent = channel.name;
        
        const rowLabels = channel.instrumentType === 'drums' ? this.sequencer.getDrumLabels() : this.sequencer.getNotes();
        const totalSteps = this.sequencer.getTotalSteps();
        
        // Use DocumentFragment for much better performance
        const fragment = document.createDocumentFragment();
        
        rowLabels.forEach((label, rowIndex) => {
            const row = document.createElement('div');
            row.className = 'sequencer-row';
            // Set dynamic grid columns
            row.style.gridTemplateColumns = `80px repeat(${totalSteps}, 35px)`;
            
            const labelDiv = document.createElement('div');
            labelDiv.className = 'sequencer-label';
            // Capitalize first letter for drums
            labelDiv.textContent = channel.instrumentType === 'drums' 
                ? label.charAt(0).toUpperCase() + label.slice(1) 
                : label;
            row.appendChild(labelDiv);
            
            for (let stepIndex = 0; stepIndex < totalSteps; stepIndex++) {
                const step = document.createElement('div');
                step.className = 'sequencer-step';
                if (stepIndex % 4 === 0) step.classList.add('beat');
                
                const isActive = channel.pattern[stepIndex] && channel.pattern[stepIndex][label];
                if (isActive) step.classList.add('active');
                
                // Use closure to capture values correctly
                step.addEventListener('click', ((currentStep, currentLabel) => {
                    return () => {
                        if (!channel.pattern[currentStep]) {
                            channel.pattern[currentStep] = {};
                        }
                        channel.pattern[currentStep][currentLabel] = !channel.pattern[currentStep][currentLabel];
                        step.classList.toggle('active');
                    };
                })(stepIndex, label));
                
                row.appendChild(step);
            }
            
            fragment.appendChild(row);
        });
        
        // Clear and append all at once for better performance
        grid.innerHTML = '';
        grid.appendChild(fragment);
    }

    selectChannel(id) {
        this.channelManager.selectChannel(id);
        
        // Use requestAnimationFrame to prevent UI lag
        requestAnimationFrame(() => {
            this.renderChannels();
            this.renderSequencerGrid();
        });
    }

    showInstrumentDialog() {
        // Edge case: Check max channels
        if (this.channelManager.getChannels().length >= 16) {
            alert('Maximum 16 channels reached. Please remove a channel before adding a new one.');
            return;
        }
        
        // Pause playback to prevent stuck notes
        const wasPlaying = this.sequencer.getIsPlaying();
        if (wasPlaying) {
            Tone.Transport.stop();
            this.sequencer.stopSequencer();
            this.sequencer.isPlaying = false;
            // Release all notes from all instruments
            this.channelManager.releaseAllNotes();
        }
        
        const instrumentType = prompt(
            '🎹 Choose instrument type:\n\n' +
            'BASIC INSTRUMENTS:\n' +
            '1 - Synth (Lead/Melody)\n' +
            '2 - Bass (Deep sound)\n' +
            '3 - Pad (Ambient)\n' +
            '4 - Pluck (Guitar-like)\n' +
            '5 - Drums (Percussion)\n\n' +
            'TECHNO/ELECTRONIC:\n' +
            '6 - Acid Bass (TB-303 style)\n' +
            '7 - FM Synth (Aggressive leads)\n\n' +
            'JAZZ/ACOUSTIC:\n' +
            '8 - Electric Piano\n' +
            '9 - Vibraphone\n' +
            '10 - Upright Bass\n\n' +
            'POKÉMON/RETRO:\n' +
            '11 - Square Wave (Chiptune lead)\n' +
            '12 - PWM Bass (Warm bass)\n' +
            '13 - Bell (Bright melody)\n' +
            '14 - Strings (Orchestral pad)\n' +
            '15 - Brass (Punchy brass)\n' +
            '16 - Pizzicato (Plucked strings)\n' +
            '17 - Marimba (Wooden percussion)\n' +
            '18 - Flute (Soft airy)\n\n' +
            'Enter number (1-18):',
            '1'
        );
        
        if (!instrumentType) {
            // Resume playback if it was playing
            if (wasPlaying) {
                Tone.Transport.start();
                this.sequencer.startSequencer();
                this.sequencer.isPlaying = true;
            }
            return;
        }
        
        // Validate input
        if (!/^([1-9]|1[0-8])$/.test(instrumentType.trim())) {
            alert('Invalid choice. Please enter a number between 1 and 18.');
            // Resume playback if it was playing
            if (wasPlaying) {
                Tone.Transport.start();
                this.sequencer.startSequencer();
                this.sequencer.isPlaying = true;
            }
            return;
        }
        
        const types = {
            '1': { type: 'synth', name: 'Lead' },
            '2': { type: 'bass', name: 'Bass' },
            '3': { type: 'pad', name: 'Pad' },
            '4': { type: 'pluck', name: 'Pluck' },
            '5': { type: 'drums', name: 'Drums' },
            '6': { type: 'acidbass', name: 'Acid Bass' },
            '7': { type: 'fmsynth', name: 'FM Synth' },
            '8': { type: 'epiano', name: 'E-Piano' },
            '9': { type: 'vibraphone', name: 'Vibraphone' },
            '10': { type: 'uprightbass', name: 'Upright Bass' },
            '11': { type: 'square', name: 'Square Wave' },
            '12': { type: 'pwmbass', name: 'PWM Bass' },
            '13': { type: 'bell', name: 'Bell' },
            '14': { type: 'strings', name: 'Strings' },
            '15': { type: 'brass', name: 'Brass' },
            '16': { type: 'pizzicato', name: 'Pizzicato' },
            '17': { type: 'marimba', name: 'Marimba' },
            '18': { type: 'flute', name: 'Flute' }
        };
        
        const selected = types[instrumentType.trim()];
        if (!selected) {
            alert('Invalid choice');
            // Resume playback if it was playing
            if (wasPlaying) {
                Tone.Transport.start();
                this.sequencer.startSequencer();
                this.sequencer.isPlaying = true;
            }
            return;
        }
        
        const name = prompt('Channel name:', `${selected.name} ${this.channelManager.getChannels().length + 1}`);
        if (name && name.trim()) {
            const newChannel = this.channelManager.addChannel(name.trim(), selected.type, 'sine');
            
            // Use requestAnimationFrame to prevent lag during UI update
            if (newChannel) {
                requestAnimationFrame(() => {
                    this.renderChannels();
                    this.renderMixerChannels();
                    this.renderSequencerGrid();
                });
            }
        }
        
        // Resume playback if it was playing
        if (wasPlaying) {
            Tone.Transport.start();
            this.sequencer.startSequencer();
            this.sequencer.isPlaying = true;
        }
    }

    showWelcomeMessage() {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            z-index: 1500;
            text-align: center;
            font-size: 1.1em;
            animation: slideDown 0.5s ease;
            max-width: 90%;
        `;
        
        message.innerHTML = `
            <div style="font-size: 1.3em; margin-bottom: 10px;">🎵 Welcome to Music Studio!</div>
            <div style="font-size: 0.9em; line-height: 1.6;">
                A demo beat is loaded. Press <strong>SPACE</strong> to play!<br>
                Click the grid to add notes • Try the keyboard A-K to play live
            </div>
            <button onclick="this.parentElement.remove()" style="
                margin-top: 15px;
                padding: 8px 20px;
                background: rgba(255,255,255,0.2);
                border: 2px solid white;
                border-radius: 6px;
                color: white;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
               onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                Got it!
            </button>
        `;
        
        document.body.appendChild(message);
        
        // Auto-dismiss after 8 seconds
        setTimeout(() => {
            if (message.parentElement) {
                message.style.animation = 'slideUp 0.5s ease';
                setTimeout(() => message.remove(), 500);
            }
        }, 8000);
    }

    showStartPrompt() {
        // Create demo setup first so everything is visible
        this.createDemoSetup();
        
        const prompt = document.createElement('div');
        prompt.id = 'startPrompt';
        prompt.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(45, 45, 58, 0.95);
            border: 2px solid #667eea;
            border-radius: 15px;
            padding: 30px 50px;
            text-align: center;
            z-index: 2000;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            animation: fadeIn 0.5s ease;
        `;
        
        prompt.innerHTML = `
            <div style="color: #667eea; font-size: 1.5em; font-weight: 600; margin-bottom: 10px;">
                🎹 Click the piano below to begin
            </div>
            <div style="color: #aaa; font-size: 1em;">
                or press any key (A-K)
            </div>
        `;
        
        document.body.appendChild(prompt);
        
        // Remove prompt on any piano key click or keyboard press
        const removePrompt = async () => {
            await window.app.audioManager.startAudio();
            prompt.remove();
            document.removeEventListener('keydown', handleKeyPress);
        };
        
        const handleKeyPress = (e) => {
            if (this.keyboardMap[e.key.toLowerCase()] || ['z','x','c','v'].includes(e.key.toLowerCase())) {
                removePrompt();
            }
        };
        
        document.addEventListener('keydown', handleKeyPress);
        
        document.querySelectorAll('.white-key, .black-key').forEach(key => {
            key.addEventListener('click', removePrompt, { once: true });
        });
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
            this.selectChannel(lead.id);
        }
        
        // Batch render all UI updates at once using requestAnimationFrame
        requestAnimationFrame(() => {
            this.renderChannels();
            this.renderMixerChannels();
            this.renderSequencerGrid();
        });
        
        // Show a friendly welcome message
        setTimeout(() => {
            this.showWelcomeMessage();
        }, 800);
    }

    loadPreset(presetName) {
        // Stop playback if playing
        const wasPlaying = this.sequencer.getIsPlaying();
        if (wasPlaying) {
            this.sequencer.stop();
        }

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
            case 'pokemon':
                this.loadPokemonPreset();
                break;
            default:
                return;
        }

        // Re-render UI
        requestAnimationFrame(() => {
            this.renderChannels();
            this.renderMixerChannels();
            this.renderSequencerGrid();
        });
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
        
        if (lead) this.selectChannel(lead.id);
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
            lead.pattern[12] = { G5: true };
        }
        
        if (drums) this.selectChannel(drums.id);
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
        
        if (keys) this.selectChannel(keys.id);
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
            lead.pattern[12] = { G5: true, A5: true };
        }
        
        if (bass) this.selectChannel(bass.id);
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
            pluck.pattern[13] = { E5: true };
        }
        
        if (pad) this.selectChannel(pad.id);
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
            pad2.pattern[0] = { G4: true, C5: true, E5: true };
            pad2.pattern[8] = { A4: true, D5: true, 'F#5': true };
        }
        
        if (vibe) {
            // Sparse melodic notes
            vibe.pattern[4] = { E5: true };
            vibe.pattern[9] = { G5: true };
            vibe.pattern[14] = { C5: true };
        }
        
        if (pad1) this.selectChannel(pad1.id);
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
        
        if (drums) this.selectChannel(drums.id);
    }

    loadPokemonPreset() {
        // Set grid to 16 steps, 2 bars for Pokémon style melody
        this.sequencer.setGridSize(16);
        this.sequencer.setBarCount(2);
        
        // Update bars select dropdown
        const barsSelect = document.getElementById('barsSelect');
        if (barsSelect) {
            barsSelect.value = '2';
        }
        
        // Create Pokémon-style instruments
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
            square.pattern[20] = { E5: true };
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
            bell.pattern[20] = { E5: true };
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
        
        if (square) this.selectChannel(square.id);
    }

    getKeyboardMap() {
        return this.keyboardMap;
    }
}

// Export for use in other modules
window.UIManager = UIManager;
