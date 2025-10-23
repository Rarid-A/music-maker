// DAW MUSIC MAKER - Multi-Instrument Support
let audioStarted = false;
let channels = [];
let selectedChannelId = null;
let currentTempo = 120;
let isPlaying = false;
let isRecording = false;
let recorder = null;
let recordedChunks = [];
let mediaStream = null;
let mediaStreamDestination = null;
let channelIdCounter = 1;
let recordingStartTime = 0;
let recordingTimerInterval = null;
let undoStack = [];
let redoStack = [];
const MAX_UNDO_STACK = 50;

const keyboardMap = {'a':'C4','w':'C#4','s':'D4','e':'D#4','d':'E4','f':'F4','t':'F#4','g':'G4','y':'G#4','h':'A4','u':'A#4','j':'B4','k':'C5'};
const notes = ['C5', 'B4', 'A#4', 'A4', 'G#4', 'G4', 'F#4', 'F4', 'E4', 'D#4', 'D4', 'C#4', 'C4', 'C3', 'E3', 'G3'];
const drumLabels = ['kick', 'snare', 'hihat', 'clap'];
let sequencerLoop = null;
let currentStep = 0;
let gridSize = 16; // 4th notes = 16 steps per bar
let barCount = 1; // Start with 1 bar for simplicity

async function startAudio() {
    if (audioStarted) return;
    
    // Show loading indicator
    showLoadingIndicator(true, 'press a key to start...');
    
    try {
        // Check browser compatibility
        if (!window.AudioContext && !window.webkitAudioContext) {
            throw new Error('Web Audio API is not supported in your browser');
        }
        
        await Tone.start();
        audioStarted = true;
        setupRecording();
        
        console.log('Audio started successfully');
    } catch (error) {
        console.error('Audio start error:', error);
        alert('Error starting audio: ' + error.message);
    } finally {
        showLoadingIndicator(false);
    }
}

function createDemoSetup() {
    // Add demo channels
    const drums = addChannel('🥁 Drums', 'drums', 'sine');
    const bass = addChannel('🎸 Bass', 'bass', 'sine');
    const lead = addChannel('🎹 Lead', 'synth', 'square');
    
    // Create a simple demo pattern for 1 bar (16 steps)
    // Drums - basic kick and hihat pattern
    if (drums) {
        // Kick on beats 1 and 3 (steps 0, 8)
        drums.pattern[0] = { kick: true };
        drums.pattern[8] = { kick: true };
        
        // Snare on beats 2 and 4 (steps 4, 12)
        drums.pattern[4] = { snare: true };
        drums.pattern[12] = { snare: true };
        
        // Hihat on every other step (8th notes)
        for (let i = 0; i < 16; i += 2) {
            if (!drums.pattern[i]) drums.pattern[i] = {};
            drums.pattern[i].hihat = true;
        }
    }
    
    // Bass - simple bass line (lower octave)
    if (bass) {
        bass.pattern[0] = { C3: true };
        bass.pattern[4] = { C3: true };
        bass.pattern[8] = { G3: true };
        bass.pattern[12] = { E3: true };
    }
    
    // Lead - catchy melody
    if (lead) {
        lead.pattern[0] = { C4: true };
        lead.pattern[2] = { E4: true };
        lead.pattern[4] = { G4: true };
        lead.pattern[6] = { E4: true };
        lead.pattern[8] = { C5: true };
        lead.pattern[10] = { G4: true };
        lead.pattern[12] = { E4: true };
        lead.pattern[14] = { C4: true };
    }
    
    // Select the lead channel by default so users can immediately see patterns
    if (lead) {
        selectChannel(lead.id);
    }
    
    // Batch render all UI updates at once using requestAnimationFrame
    requestAnimationFrame(() => {
        renderChannels();
        renderMixerChannels();
        renderSequencerGrid();
    });
    
    // Show a friendly welcome message
    setTimeout(() => {
        showWelcomeMessage();
    }, 800);
}

function showWelcomeMessage() {
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

function setupRecording() {
    try {
        // Check MediaRecorder support
        if (!window.MediaRecorder) {
            console.warn('MediaRecorder is not supported in your browser');
            return;
        }
        
        const toneContext = Tone.getContext();
        const audioContext = toneContext.rawContext || toneContext._context;
        mediaStreamDestination = audioContext.createMediaStreamDestination();
        mediaStream = mediaStreamDestination.stream;
        
        // Enable download button once recording is set up
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.title = 'Record audio first, then export';
        }
    } catch (error) {
        console.error('Recording setup error:', error);
        alert('Recording feature is not available: ' + error.message);
    }
}

async function init() {
    Tone.Transport.bpm.value = currentTempo;
    Tone.Transport.loop = true;
    updateLoopEnd(); // Set initial loop end based on bar count
    setupEventListeners();
    
    // Update the bars select to show the correct initial value
    const barsSelect = document.getElementById('barsSelect');
    if (barsSelect) {
        barsSelect.value = barCount.toString();
    }
    
    // Auto-initialize audio and create demo setup on page load
    await initializeAudioAndDemo();
}

async function initializeAudioAndDemo() {
    try {
        showLoadingIndicator(true, 'Loading Music Studio...');
        
        // Start audio context
        await startAudio();
        
        // Create demo setup
        createDemoSetup();
        
        showLoadingIndicator(false);
    } catch (error) {
        console.error('Initialization error:', error);
        showLoadingIndicator(false);
        
        // If auto-start fails (some browsers require user interaction), show simple message
        showStartPrompt();
    }
}

function showStartPrompt() {
    // Create demo setup first so everything is visible
    createDemoSetup();
    
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
        await startAudio();
        prompt.remove();
        document.removeEventListener('keydown', handleKeyPress);
    };
    
    const handleKeyPress = (e) => {
        if (keyboardMap[e.key.toLowerCase()] || ['z','x','c','v'].includes(e.key.toLowerCase())) {
            removePrompt();
        }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    
    document.querySelectorAll('.white-key, .black-key').forEach(key => {
        key.addEventListener('click', removePrompt, { once: true });
    });
}

function updateLoopEnd() {
    Tone.Transport.loopEnd = `${barCount}m`;
}

function getTotalSteps() {
    return gridSize * barCount;
}

function resizePatterns() {
    const newTotalSteps = getTotalSteps();
    
    // Edge case: Validate new total steps
    if (newTotalSteps <= 0 || newTotalSteps > 128) {
        console.error('Invalid total steps:', newTotalSteps);
        return;
    }
    
    channels.forEach(channel => {
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

function addChannel(name, instrumentType = 'synth', waveType = 'sine') {
    // Edge case: Check if too many channels
    if (channels.length >= 16) {
        alert('Maximum 16 channels reached. Please remove a channel before adding a new one.');
        return null;
    }
    
    // Edge case: Validate name
    if (!name || name.trim().length === 0) {
        name = `Channel ${channelIdCounter}`;
    }
    
    const id = channelIdCounter++;
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
        if (mediaStreamDestination) {
            instrument.kick.connect(mediaStreamDestination);
            instrument.snare.connect(mediaStreamDestination);
            instrument.hihat.connect(mediaStreamDestination);
            instrument.clap.connect(mediaStreamDestination);
        }
    } else if (instrumentType === 'bass') {
        instrument = new Tone.MonoSynth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.1 },
            filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.2, baseFrequency: 200, octaves: 2.6 }
        }).toDestination();
        if (mediaStreamDestination) instrument.connect(mediaStreamDestination);
        instrument.volume.value = -10;
    } else if (instrumentType === 'pad') {
        instrument = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.8, decay: 0.5, sustain: 0.8, release: 2.0 }
        }).toDestination();
        if (mediaStreamDestination) instrument.connect(mediaStreamDestination);
        instrument.volume.value = -15;
    } else if (instrumentType === 'pluck') {
        instrument = new Tone.PluckSynth({
            attackNoise: 1,
            dampening: 4000,
            resonance: 0.9
        }).toDestination();
        if (mediaStreamDestination) instrument.connect(mediaStreamDestination);
        instrument.volume.value = -5; // Increased volume for pluck
    } else {
        // Default synth
        instrument = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: waveType },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 }
        }).toDestination();
        if (mediaStreamDestination) instrument.connect(mediaStreamDestination);
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
        pattern: Array(getTotalSteps()).fill(null).map(() => ({})) // Dynamic pattern size
    };
    channels.push(channel);
    
    // Don't render here - let the caller decide when to render to avoid lag
    // Rendering is done in showInstrumentDialog or createDemoSetup
    selectChannel(id);
    return channel;
}

function selectChannel(id) {
    // Edge case: Validate channel exists
    const channel = channels.find(ch => ch.id === id);
    if (!channel) {
        console.warn('Channel not found:', id);
        return;
    }
    
    selectedChannelId = id;
    
    // Use requestAnimationFrame to prevent UI lag
    requestAnimationFrame(() => {
        renderChannels();
        renderSequencerGrid();
    });
}

function getSelectedChannel() {
    const channel = channels.find(ch => ch.id === selectedChannelId);
    // Edge case: If selected channel doesn't exist, select the first one
    if (!channel && channels.length > 0) {
        selectedChannelId = channels[0].id;
        return channels[0];
    }
    return channel;
}

function playNote(channel, note, time = undefined) {
    if (!channel || channel.muted || channel.instrumentType === 'drums') {
        return;
    }
    
    try {
        if (channel.instrumentType === 'bass') {
            channel.synth.triggerAttackRelease(note, '8n', time);
        } else if (channel.instrumentType === 'pluck') {
            // Pluck needs a different duration for proper sound
            channel.synth.triggerAttackRelease(note, '4n', time);
        } else {
            channel.synth.triggerAttackRelease(note, '8n', time);
        }
    } catch (error) {
        console.error('Error playing note:', error);
    }
}

function playDrum(channel, drumType, time = undefined) {
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

function showInstrumentDialog() {
    // Edge case: Check max channels
    if (channels.length >= 16) {
        alert('Maximum 16 channels reached. Please remove a channel before adding a new one.');
        return;
    }
    
    // Pause playback to prevent stuck notes
    const wasPlaying = isPlaying;
    if (isPlaying) {
        Tone.Transport.pause();
        stopSequencer();
        isPlaying = false;
    }
    
    const instrumentType = prompt(
        '🎹 Choose instrument type:\n\n' +
        '1 - Synth (Lead/Melody)\n' +
        '2 - Bass (Deep sound)\n' +
        '3 - Pad (Ambient)\n' +
        '4 - Pluck (Guitar-like)\n' +
        '5 - Drums (Percussion)\n\n' +
        'Enter number (1-5):',
        '1'
    );
    
    if (!instrumentType) {
        // Resume playback if it was playing
        if (wasPlaying) {
            Tone.Transport.start();
            startSequencer();
            isPlaying = true;
        }
        return;
    }
    
    // Validate input
    if (!/^[1-5]$/.test(instrumentType.trim())) {
        alert('Invalid choice. Please enter a number between 1 and 5.');
        // Resume playback if it was playing
        if (wasPlaying) {
            Tone.Transport.start();
            startSequencer();
            isPlaying = true;
        }
        return;
    }
    
    const types = {
        '1': { type: 'synth', name: 'Lead' },
        '2': { type: 'bass', name: 'Bass' },
        '3': { type: 'pad', name: 'Pad' },
        '4': { type: 'pluck', name: 'Pluck' },
        '5': { type: 'drums', name: 'Drums' }
    };
    
    const selected = types[instrumentType.trim()];
    if (!selected) {
        alert('Invalid choice');
        // Resume playback if it was playing
        if (wasPlaying) {
            Tone.Transport.start();
            startSequencer();
            isPlaying = true;
        }
        return;
    }
    
    const name = prompt('Channel name:', `${selected.name} ${channels.length + 1}`);
    if (name && name.trim()) {
        const newChannel = addChannel(name.trim(), selected.type, 'sine');
        
        // Use requestAnimationFrame to prevent lag during UI update
        if (newChannel) {
            requestAnimationFrame(() => {
                renderChannels();
                renderMixerChannels();
                renderSequencerGrid();
            });
        }
    }
    
    // Resume playback if it was playing
    if (wasPlaying) {
        Tone.Transport.start();
        startSequencer();
        isPlaying = true;
    }
}

function updateChannel(id, property, value) {
    const channel = channels.find(ch => ch.id === id);
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
            channel.synth.set({ envelope: { attack: channel.attack / 1000, release: channel.release / 1000 } });
        }
    }
    
    // Only re-render mixer if volume or mute changed (avoid unnecessary re-renders)
    if (property === 'volume' || property === 'muted') {
        requestAnimationFrame(() => {
            renderMixerChannels();
        });
    }
}

// Make updateChannel available globally for inline event handlers
window.updateChannel = updateChannel;

function removeChannel(id) {
    const index = channels.findIndex(ch => ch.id === id);
    if (index === -1) return;
    
    // Edge case: Don't allow removing the last channel
    if (channels.length === 1) {
        alert('Cannot remove the last channel. Keep at least one channel in your project.');
        return;
    }
    
    // Pause playback to prevent stuck notes
    const wasPlaying = isPlaying;
    if (isPlaying) {
        Tone.Transport.pause();
        stopSequencer();
        isPlaying = false;
    }
    
    // Save state for undo
    saveUndoState();
    
    const channel = channels[index];
    
    try {
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
    } catch (error) {
        console.error('Error disposing instrument:', error);
    }
    
    channels.splice(index, 1);
    if (selectedChannelId === id && channels.length > 0) {
        selectedChannelId = channels[0].id;
    } else if (channels.length === 0) {
        selectedChannelId = null;
    }
    
    // Use requestAnimationFrame to prevent lag
    requestAnimationFrame(() => {
        renderChannels();
        renderMixerChannels();
        renderSequencerGrid();
    });
    
    // Resume playback if it was playing
    if (wasPlaying) {
        setTimeout(() => {
            Tone.Transport.start();
            startSequencer();
            isPlaying = true;
        }, 100);
    }
}

// Make removeChannel available globally for inline event handlers
window.removeChannel = removeChannel;

function renderChannels() {
    const channelsList = document.getElementById('channelsList');
    if (!channelsList) return;
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    channels.forEach(channel => {
        const div = document.createElement('div');
        div.className = `channel-item ${channel.id === selectedChannelId ? 'selected' : ''}`;
        div.onclick = () => selectChannel(channel.id);
        
        // Show different settings based on instrument type
        const settingsHTML = channel.instrumentType === 'drums' ? `
            <div class="channel-settings">
                <div class="setting-item" style="grid-column: 1 / -1;">
                    <label>Drums</label>
                    <div style="font-size: 0.75em; color: #888;">Kick, Snare, HiHat, Clap</div>
                </div>
            </div>
        ` : `
            <div class="channel-settings">
                <div class="setting-item">
                    <label>Type</label>
                    <select onchange="updateChannel(${channel.id}, 'waveType', this.value)" onclick="event.stopPropagation()" ${(channel.instrumentType === 'synth' || channel.instrumentType === 'pad') ? '' : 'disabled'}>
                        <option value="sine" ${channel.waveType==='sine'?'selected':''}>Sine</option>
                        <option value="square" ${channel.waveType==='square'?'selected':''}>Square</option>
                        <option value="triangle" ${channel.waveType==='triangle'?'selected':''}>Triangle</option>
                        <option value="sawtooth" ${channel.waveType==='sawtooth'?'selected':''}>Saw</option>
                    </select>
                </div>
                <div class="setting-item">
                    <label>Attack</label>
                    <input type="range" min="0" max="500" value="${channel.attack}" step="10" 
                           onchange="updateChannel(${channel.id}, 'attack', parseInt(this.value))" onclick="event.stopPropagation()">
                </div>
            </div>
        `;
        
        div.innerHTML = `
            <div class="channel-header">
                <div class="channel-name-display">${channel.name} <span style="font-size:0.8em;color:#888;">[${channel.instrumentType}]</span></div>
                <button class="channel-btn" onclick="event.stopPropagation(); removeChannel(${channel.id})">✕</button>
            </div>
            ${settingsHTML}
        `;
        fragment.appendChild(div);
    });
    
    // Clear and append all at once
    channelsList.innerHTML = '';
    channelsList.appendChild(fragment);
}

function renderMixerChannels() {
    const mixerChannels = document.getElementById('mixerChannels');
    if (!mixerChannels) return;
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    channels.forEach(channel => {
        const div = document.createElement('div');
        div.className = 'mixer-channel';
        div.innerHTML = `
            <div class="channel-name">${channel.name}</div>
            <input type="range" class="volume-slider" min="0" max="1" value="${channel.volume}" step="0.01"
                   oninput="updateChannel(${channel.id}, 'volume', parseFloat(this.value))">
            <div class="volume-label">${Math.round(channel.volume*100)}%</div>
            <div class="mixer-controls">
                <button class="mixer-btn ${channel.muted?'active':''}" 
                        onclick="updateChannel(${channel.id}, 'muted', !${channel.muted})">M</button>
            </div>
        `;
        fragment.appendChild(div);
    });
    
    // Clear and append all at once
    mixerChannels.innerHTML = '';
    mixerChannels.appendChild(fragment);
}

function renderSequencerGrid() {
    const grid = document.getElementById('sequencerGrid');
    if (!grid) return;
    
    const channel = channels.find(c => c.id === selectedChannelId);
    if (!channel) {
        document.getElementById('selectedChannelName').textContent = 'None';
        grid.innerHTML = '<div style="color: #888; padding: 20px; text-align: center;">Select a channel to edit patterns</div>';
        return;
    }
    
    document.getElementById('selectedChannelName').textContent = channel.name;
    
    const rowLabels = channel.instrumentType === 'drums' ? drumLabels : notes;
    const totalSteps = getTotalSteps();
    
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
                    // Save state for undo
                    saveUndoState();
                    
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

function startSequencer() {
    if (sequencerLoop) return;
    
    currentStep = 0;
    const totalSteps = getTotalSteps();
    const noteValue = gridSize === 16 ? '16n' : gridSize === 8 ? '8n' : '4n';
    
    sequencerLoop = new Tone.Loop((time) => {
        channels.forEach(channel => {
            if (channel.muted) return; // Skip muted channels
            
            const step = channel.pattern[currentStep];
            if (step && channel.instrumentType === 'drums') {
                drumLabels.forEach(drumType => {
                    if (step[drumType]) {
                        playDrum(channel, drumType, time);
                    }
                });
            } else if (step) {
                notes.forEach(note => {
                    if (step[note]) {
                        playNote(channel, note, time);
                    }
                });
            }
        });
        
        // Update beat counter
        const bar = Math.floor(currentStep / gridSize) + 1;
        const beat = Math.floor((currentStep % gridSize) / 4) + 1;
        const tick = (currentStep % 4) + 1;
        
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
                if (stepPos === currentStep) {
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
        
        currentStep = (currentStep + 1) % totalSteps;
    }, noteValue);
    
    sequencerLoop.start(0);
}

function stopSequencer() {
    if (sequencerLoop) {
        sequencerLoop.stop();
        sequencerLoop.dispose();
        sequencerLoop = null;
    }
    currentStep = 0;
    
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

function setupEventListeners() {
    document.getElementById('addChannelBtn')?.addEventListener('click', async () => {
        await startAudio();
        showInstrumentDialog();
    });
    
    // Prevent default behavior to avoid scrolling when focused
    document.getElementById('tempoInput')?.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        // Edge case: Clamp tempo value
        const clampedValue = Math.max(40, Math.min(200, value || 120));
        if (!isNaN(clampedValue)) {
            currentTempo = clampedValue;
            Tone.Transport.bpm.value = currentTempo;
            e.target.value = clampedValue;
        }
    });
    
    document.getElementById('gridSelect')?.addEventListener('change', (e) => {
        saveUndoState();
        gridSize = parseInt(e.target.value);
        resizePatterns();
        
        // Use requestAnimationFrame to prevent lag
        requestAnimationFrame(() => {
            renderSequencerGrid();
        });
    });
    
    document.getElementById('barsSelect')?.addEventListener('change', (e) => {
        saveUndoState();
        barCount = parseInt(e.target.value);
        updateLoopEnd();
        resizePatterns();
        
        // Use requestAnimationFrame to prevent lag
        requestAnimationFrame(() => {
            renderSequencerGrid();
        });
    });
    
    document.getElementById('playBtn')?.addEventListener('click', togglePlay);
    document.getElementById('stopBtn')?.addEventListener('click', stop);
    document.getElementById('exportBtn')?.addEventListener('click', exportLoop);
    
    document.getElementById('guideToggle')?.addEventListener('click', () => {
        document.getElementById('guideOverlay')?.classList.toggle('hidden');
    });
    document.getElementById('closeGuide')?.addEventListener('click', () => {
        document.getElementById('guideOverlay')?.classList.add('hidden');
    });
    
    document.querySelectorAll('.white-key, .black-key').forEach(key => {
        // Mouse events
        key.addEventListener('mousedown', async (e) => {
            e.preventDefault();
            await startAudio();
            const note = key.getAttribute('data-note');
            const channel = getSelectedChannel();
            if (note && channel) {
                playNote(channel, note);
                key.classList.add('active');
                setTimeout(() => key.classList.remove('active'), 300);
            }
        });
        
        // Touch events for mobile
        key.addEventListener('touchstart', async (e) => {
            e.preventDefault();
            await startAudio();
            const note = key.getAttribute('data-note');
            const channel = getSelectedChannel();
            if (note && channel) {
                playNote(channel, note);
                key.classList.add('active');
                setTimeout(() => key.classList.remove('active'), 300);
            }
        });
        
        // Keyboard support
        key.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                await startAudio();
                const note = key.getAttribute('data-note');
                const channel = getSelectedChannel();
                if (note && channel) {
                    playNote(channel, note);
                    key.classList.add('active');
                    setTimeout(() => key.classList.remove('active'), 300);
                }
            }
        });
    });
    
    const pressedKeys = new Set();
    const drumKeys = { 'z': 'kick', 'x': 'snare', 'c': 'hihat', 'v': 'clap' };
    
    document.addEventListener('keydown', async (e) => {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Space bar - Play/Pause
        if (e.code === 'Space') { 
            e.preventDefault(); 
            togglePlay(); 
            return; 
        }
        
        // Delete key - clear pattern for selected channel
        if (e.key === 'Delete' && selectedChannelId) {
            e.preventDefault();
            clearPattern();
            return;
        }
        
        // Ctrl+Z - Undo
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
            return;
        }
        
        // Ctrl+Shift+Z or Ctrl+Y - Redo
        if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
            e.preventDefault();
            redo();
            return;
        }
        
        // Escape - Stop playback
        if (e.key === 'Escape') {
            e.preventDefault();
            stop();
            return;
        }
        
        const key = e.key.toLowerCase();
        if (pressedKeys.has(key)) return;
        pressedKeys.add(key);
        
        await startAudio();
        const channel = getSelectedChannel();
        if (!channel || channel.muted) return;
        
        // Check if it's a drum key
        if (drumKeys[key] && channel.instrumentType === 'drums') {
            playDrum(channel, drumKeys[key]);
        } else {
            const note = keyboardMap[key];
            if (note) {
                playNote(channel, note);
                document.querySelector(`[data-note="${note}"]`)?.classList.add('active');
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        pressedKeys.delete(key);
        const note = keyboardMap[key];
        if (note) document.querySelector(`[data-note="${note}"]`)?.classList.remove('active');
    });
    
    document.getElementById('masterVolume')?.addEventListener('input', (e) => {
        Tone.Destination.volume.value = -20 + (parseFloat(e.target.value) * 20);
        document.getElementById('masterVolumeLabel').textContent = Math.round(parseFloat(e.target.value)*100) + '%';
    });
}

async function togglePlay() {
    await startAudio();
    if (isPlaying) {
        Tone.Transport.pause();
        stopSequencer();
        isPlaying = false;
    } else {
        Tone.Transport.start();
        startSequencer();
        isPlaying = true;
    }
}

function stop() {
    Tone.Transport.stop();
    stopSequencer();
    isPlaying = false;
}

async function exportLoop() {
    await startAudio();
    
    // Edge case: Check if there are any patterns
    const hasPatterns = channels.some(ch => 
        ch.pattern.some(step => Object.keys(step).length > 0)
    );
    
    if (!hasPatterns) {
        alert('No patterns to export! Add some notes to the grid first.');
        return;
    }
    
    if (!mediaStream) { 
        alert('Audio stream not ready. Please wait for audio to initialize.'); 
        return;
    }
    
    // Pause playback first to prevent stuck notes
    const wasPlaying = isPlaying;
    if (isPlaying) {
        Tone.Transport.pause();
        stopSequencer();
        isPlaying = false;
    }
    
    showLoadingIndicator(true, 'Preparing export...');
    
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
        
        recordedChunks = [];
        recorder = new MediaRecorder(mediaStream, { mimeType });
        
        recorder.ondataavailable = (e) => { 
            if (e.data.size > 0) recordedChunks.push(e.data); 
        };
        
        recorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: mimeType });
            convertAndDownloadMP3(blob);
            
            // Resume playback if it was playing before
            if (wasPlaying) {
                setTimeout(() => {
                    Tone.Transport.start();
                    startSequencer();
                    isPlaying = true;
                }, 100);
            }
        };
        
        recorder.start();
        
        // Calculate loop duration
        const loopDuration = Tone.Time(Tone.Transport.loopEnd).toSeconds();
        
        showLoadingIndicator(true, `Recording ${barCount} bar loop...`);
        
        // Reset transport position to start of loop
        Tone.Transport.position = 0;
        currentStep = 0;
        
        // Start fresh playback for recording
        Tone.Transport.start();
        startSequencer();
        
        // Record for exactly one loop
        setTimeout(() => {
            recorder.stop();
            
            // Stop playback after recording
            Tone.Transport.stop();
            stopSequencer();
            isPlaying = false;
        }, loopDuration * 1000 + 100); // Add 100ms buffer
        
    } catch (error) {
        console.error('Export error:', error);
        alert('Export error: ' + error.message);
        showLoadingIndicator(false);
        
        // Resume playback if it was playing before error
        if (wasPlaying) {
            Tone.Transport.start();
            startSequencer();
            isPlaying = true;
        }
    }
}async function convertAndDownloadMP3(webmBlob) {
    showLoadingIndicator(true, 'Converting to MP3...');
    
    try {
        const mp3Blob = await convertToMp3(webmBlob);
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
        showLoadingIndicator(false);
    }
}

async function convertToMp3(webmBlob) {
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
                const leftPCM = floatTo16BitPCM(left);
                const rightPCM = floatTo16BitPCM(right);
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

function floatTo16BitPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
}

// Undo/Redo functionality
function saveUndoState() {
    const state = {
        channels: JSON.parse(JSON.stringify(channels.map(ch => ({
            id: ch.id,
            name: ch.name,
            instrumentType: ch.instrumentType,
            waveType: ch.waveType,
            volume: ch.volume,
            muted: ch.muted,
            attack: ch.attack,
            release: ch.release,
            pattern: ch.pattern
        })))),
        selectedChannelId,
        gridSize,
        barCount
    };
    
    undoStack.push(state);
    if (undoStack.length > MAX_UNDO_STACK) {
        undoStack.shift();
    }
    redoStack = []; // Clear redo stack on new action
}

function undo() {
    if (undoStack.length === 0) {
        // Silent fail for better UX
        return;
    }
    
    // Save current state to redo stack
    const currentState = {
        channels: JSON.parse(JSON.stringify(channels.map(ch => ({
            id: ch.id,
            name: ch.name,
            instrumentType: ch.instrumentType,
            waveType: ch.waveType,
            volume: ch.volume,
            muted: ch.muted,
            attack: ch.attack,
            release: ch.release,
            pattern: ch.pattern
        })))),
        selectedChannelId,
        gridSize,
        barCount
    };
    redoStack.push(currentState);
    
    // Restore previous state
    const state = undoStack.pop();
    restoreState(state);
}

function redo() {
    if (redoStack.length === 0) {
        // Silent fail for better UX
        return;
    }
    
    // Save current state to undo stack
    saveUndoState();
    
    // Restore redo state
    const state = redoStack.pop();
    restoreState(state);
}

function restoreState(state) {
    // This is a simplified restore - in production you'd need to recreate instruments
    selectedChannelId = state.selectedChannelId;
    gridSize = state.gridSize;
    barCount = state.barCount;
    
    // Update patterns only (instruments remain)
    state.channels.forEach(savedChannel => {
        const channel = channels.find(ch => ch.id === savedChannel.id);
        if (channel) {
            channel.pattern = savedChannel.pattern;
            channel.volume = savedChannel.volume;
            channel.muted = savedChannel.muted;
        }
    });
    
    updateLoopEnd();
    
    // Batch all UI updates together
    requestAnimationFrame(() => {
        renderChannels();
        renderMixerChannels();
        renderSequencerGrid();
    });
}

function clearPattern() {
    const channel = channels.find(c => c.id === selectedChannelId);
    if (!channel) {
        alert('Please select a channel first');
        return;
    }
    
    if (confirm(`Clear all patterns for "${channel.name}"?`)) {
        saveUndoState();
        const totalSteps = getTotalSteps();
        channel.pattern = Array(totalSteps).fill(null).map(() => ({}));
        
        // Use requestAnimationFrame to prevent lag
        requestAnimationFrame(() => {
            renderSequencerGrid();
        });
    }
}

// Utility function to save project
function saveProject() {
    try {
        const project = {
            version: '1.0',
            tempo: currentTempo,
            gridSize,
            barCount,
            channels: channels.map(ch => ({
                id: ch.id,
                name: ch.name,
                instrumentType: ch.instrumentType,
                waveType: ch.waveType,
                volume: ch.volume,
                muted: ch.muted,
                attack: ch.attack,
                release: ch.release,
                pattern: ch.pattern
            }))
        };
        
        const json = JSON.stringify(project, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `music-project-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        alert('✅ Project saved successfully!');
    } catch (error) {
        console.error('Save project error:', error);
        alert('Failed to save project: ' + error.message);
    }
}

function loadProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const project = JSON.parse(text);
            
            // Validate project structure
            if (!project.channels || !Array.isArray(project.channels)) {
                throw new Error('Invalid project file');
            }
            
            // Clear existing channels
            while (channels.length > 0) {
                const ch = channels[0];
                if (ch.instrumentType === 'drums') {
                    ch.synth.kick?.dispose();
                    ch.synth.snare?.dispose();
                    ch.synth.hihat?.dispose();
                    ch.synth.clap?.dispose();
                } else {
                    ch.synth?.dispose();
                }
                channels.shift();
            }
            
            // Restore settings
            currentTempo = project.tempo || 120;
            gridSize = project.gridSize || 16;
            barCount = project.barCount || 4;
            Tone.Transport.bpm.value = currentTempo;
            document.getElementById('tempoInput').value = currentTempo;
            updateLoopEnd();
            
            // Recreate channels
            await startAudio();
            project.channels.forEach(chData => {
                const ch = addChannel(chData.name, chData.instrumentType, chData.waveType);
                if (ch) {
                    ch.volume = chData.volume;
                    ch.muted = chData.muted;
                    ch.attack = chData.attack;
                    ch.release = chData.release;
                    ch.pattern = chData.pattern;
                    updateChannel(ch.id, 'volume', ch.volume);
                    updateChannel(ch.id, 'muted', ch.muted);
                }
            });
            
            renderChannels();
            renderMixerChannels();
            renderSequencerGrid();
            
            alert('✅ Project loaded successfully!');
        } catch (error) {
            console.error('Load project error:', error);
            alert('Failed to load project: ' + error.message);
        }
    };
    
    input.click();
}

// Loading indicator
function showLoadingIndicator(show, message = 'Loading...') {
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
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    if (typeof Tone === 'undefined') { 
        alert('Tone.js library failed to load. Please check your internet connection.'); 
        return; 
    }
    init();
});
