// UI MODULE - DOM manipulation and rendering
class UIManager {
    constructor(channelManager, sequencer) {
        this.channelManager = channelManager;
        this.sequencer = sequencer;
        this.keyboardMap = {'a':'C4','w':'C#4','s':'D4','e':'D#4','d':'E4','f':'F4','t':'F#4','g':'G4','y':'G#4','h':'A4','u':'A#4','j':'B4','k':'C5'};
        
        // Initialize preset manager
        this.presetManager = new PresetManager(channelManager, sequencer);
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
        
        // Show the instrument dialog
        const dialog = document.getElementById('instrumentDialog');
        if (!dialog) {
            console.error('Instrument dialog not found');
            return;
        }
        
        // Clear all selections
        document.querySelectorAll('.instrument-select').forEach(select => {
            select.selectedIndex = -1;
        });
        
        dialog.classList.remove('hidden');
        
        // Instrument type mapping
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
            '18': { type: 'flute', name: 'Flute' },
            '19': { type: 'supersaw', name: 'Supersaw' },
            '20': { type: 'reesebass', name: 'Reese Bass' },
            '21': { type: 'wobblebass', name: 'Wobble Bass' }
        };
        
        // Handle OK button
        const handleOk = () => {
            // Get selected value from any of the select boxes
            let selectedValue = null;
            document.querySelectorAll('.instrument-select').forEach(select => {
                if (select.selectedIndex >= 0) {
                    selectedValue = select.value;
                }
            });
            
            if (!selectedValue) {
                alert('Please select an instrument type');
                return;
            }
            
            const selected = types[selectedValue];
            if (!selected) {
                alert('Invalid selection');
                cleanup();
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
            
            cleanup();
        };
        
        // Handle Cancel button
        const handleCancel = () => {
            cleanup();
        };
        
        // Handle double-click on select boxes
        const handleDoubleClick = (e) => {
            if (e.target.tagName === 'OPTION') {
                handleOk();
            }
        };
        
        // Cleanup function
        const cleanup = () => {
            dialog.classList.add('hidden');
            document.getElementById('instrumentDialogOk').removeEventListener('click', handleOk);
            document.getElementById('instrumentDialogCancel').removeEventListener('click', handleCancel);
            document.querySelectorAll('.instrument-select').forEach(select => {
                select.removeEventListener('dblclick', handleDoubleClick);
            });
            
            // Resume playback if it was playing
            if (wasPlaying) {
                Tone.Transport.start();
                this.sequencer.startSequencer();
                this.sequencer.isPlaying = true;
            }
        };
        
        // Add event listeners
        document.getElementById('instrumentDialogOk').addEventListener('click', handleOk);
        document.getElementById('instrumentDialogCancel').addEventListener('click', handleCancel);
        document.querySelectorAll('.instrument-select').forEach(select => {
            select.addEventListener('dblclick', handleDoubleClick);
        });
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
            // Mark initial demo as loaded
            if (window.app) {
                window.app.initialDemoLoaded = true;
            }
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
        // Use preset manager to create demo setup
        const channels = this.presetManager.createDemoSetup();
        
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
        // Delegate to preset manager
        this.presetManager.loadPreset(presetName);
        
        // Re-render UI
        requestAnimationFrame(() => {
            this.renderChannels();
            this.renderMixerChannels();
            this.renderSequencerGrid();
        });
    }

    getKeyboardMap() {
        return this.keyboardMap;
    }
}

// Export for use in other modules
window.UIManager = UIManager;
