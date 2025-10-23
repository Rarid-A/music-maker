// ============================================================
// MUSIC MAKER - SIMPLE AND FUNCTIONAL
// ============================================================

// Global state
let synth = null;
let currentWaveType = 'sine';
let currentTempo = 120;
let currentVolume = 0.5;
let loopBeats = 4;
let currentAttack = 10;
let currentRelease = 200;

let recorder = null;
let recordedChunks = [];
let recordedBlob = null;
let isRecording = false;
let mediaStream = null;
let audioContext = null;
let mediaStreamDestination = null;

// Keyboard mapping
const keyboardMap = {
    'a': 'C4', 'w': 'C#4',
    's': 'D4', 'e': 'D#4',
    'd': 'E4',
    'f': 'F4', 't': 'F#4',
    'g': 'G4', 'y': 'G#4',
    'h': 'A4', 'u': 'A#4',
    'j': 'B4',
    'k': 'C5'
};

// ============================================================
// INITIALIZATION
// ============================================================

let audioStarted = false;

async function startAudio() {
    if (audioStarted) return;
    
    console.log('🎵 Starting audio context...');
    
    try {
        await Tone.start();
        console.log('✅ Audio context started');
        audioStarted = true;
        
        // Hide the start overlay
        const overlay = document.getElementById('startOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        
    } catch (error) {
        console.error('❌ Audio start failed:', error);
        alert('Error starting audio: ' + error.message);
    }
}

function init() {
    console.log('🎵 Initializing Music Maker...');
    
    try {
        // Setup recording
        setupRecording();
        
        // Create the synth
        createSynth();
        
        // Attach all event listeners
        setupEventListeners();
        
        // Initialize Tone Transport
        Tone.Transport.bpm.value = currentTempo;
        Tone.Transport.start();
        
        console.log('✅ Music Maker ready! Waiting for user interaction...');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        alert('Error: ' + error.message);
    }
}

// Create the synthesizer
function createSynth() {
    try {
        if (synth) {
            synth.dispose();
        }
        
        // Create synth
        synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: currentWaveType },
            envelope: {
                attack: currentAttack / 1000,
                decay: 0.1,
                sustain: 0.3,
                release: currentRelease / 1000
            }
        });
        
        // Connect to main output
        synth.toDestination();
        
        // Also connect to media stream destination if it exists (for recording)
        if (mediaStreamDestination) {
            synth.connect(mediaStreamDestination);
        }
        
        synth.volume.value = -6 + (currentVolume * 12);
        console.log('✅ Synth created:', currentWaveType);
        
    } catch (error) {
        console.error('❌ Error creating synth:', error);
    }
}

// Setup recording - connect Tone output to MediaStream
function setupRecording() {
    try {
        // Get the audio context (will be created even if not started yet)
        const toneContext = Tone.getContext();
        audioContext = toneContext.rawContext || toneContext._context;
        
        // Create a MediaStreamDestination to capture audio
        mediaStreamDestination = audioContext.createMediaStreamDestination();
        
        mediaStream = mediaStreamDestination.stream;
        console.log('✅ Recording setup complete, media stream created');
        
    } catch (error) {
        console.error('❌ Recording setup error:', error);
    }
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // START AUDIO BUTTON
    const startAudioBtn = document.getElementById('startAudioBtn');
    if (startAudioBtn) {
        startAudioBtn.addEventListener('click', startAudio);
        console.log('✅ Start audio button ready');
    }
    
    // INSTRUMENT SELECTOR
    const instrumentSelect = document.getElementById('instrumentSelect');
    if (instrumentSelect) {
        instrumentSelect.addEventListener('change', (e) => {
            currentWaveType = e.target.value;
            console.log('Wave type changed to:', currentWaveType);
            createSynth();
        });
        console.log('✅ Instrument selector ready');
    } else {
        console.error('❌ Instrument selector not found');
    }
    
    // TEMPO SLIDER
    const tempoSlider = document.getElementById('tempoSlider');
    const tempoDisplay = document.getElementById('tempoDisplay');
    if (tempoSlider && tempoDisplay) {
        tempoSlider.addEventListener('input', (e) => {
            currentTempo = parseInt(e.target.value);
            tempoDisplay.textContent = currentTempo;
            Tone.Transport.bpm.value = currentTempo;
            console.log('Tempo changed to:', currentTempo, 'BPM');
        });
        console.log('✅ Tempo slider ready');
    } else {
        console.error('❌ Tempo slider or display not found');
    }
    
    // VOLUME SLIDER
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeDisplay = document.getElementById('volumeDisplay');
    if (volumeSlider && volumeDisplay) {
        volumeSlider.addEventListener('input', (e) => {
            currentVolume = parseFloat(e.target.value);
            volumeDisplay.textContent = Math.round(currentVolume * 100) + '%';
            if (synth) {
                synth.volume.value = -6 + (currentVolume * 12);
                console.log('Volume changed to:', currentVolume, '| Synth volume:', synth.volume.value);
            }
        });
        console.log('✅ Volume slider ready');
    } else {
        console.error('❌ Volume slider or display not found');
    }
    
    // LOOP DURATION
    const loopSelect = document.getElementById('loopBeatsSelect');
    if (loopSelect) {
        loopSelect.addEventListener('change', (e) => {
            loopBeats = parseInt(e.target.value);
            console.log('Loop duration changed to:', loopBeats, 'beats');
        });
        console.log('✅ Loop selector ready');
    }
    
    // ATTACK SLIDER
    const attackSlider = document.getElementById('attackSlider');
    const attackDisplay = document.getElementById('attackDisplay');
    if (attackSlider && attackDisplay) {
        attackSlider.addEventListener('input', (e) => {
            currentAttack = parseInt(e.target.value);
            attackDisplay.textContent = currentAttack;
            createSynth();
            console.log('Attack changed to:', currentAttack, 'ms');
        });
        console.log('✅ Attack slider ready');
    } else {
        console.error('❌ Attack slider or display not found');
    }
    
    // RELEASE SLIDER
    const releaseSlider = document.getElementById('decaySlider');
    const releaseDisplay = document.getElementById('decayDisplay');
    if (releaseSlider && releaseDisplay) {
        releaseSlider.addEventListener('input', (e) => {
            currentRelease = parseInt(e.target.value);
            releaseDisplay.textContent = currentRelease;
            createSynth();
            console.log('Release changed to:', currentRelease, 'ms');
        });
        console.log('✅ Release slider ready');
    } else {
        console.error('❌ Release slider or display not found');
    }
    
    // PIANO KEYS
    document.querySelectorAll('.white-key, .black-key').forEach((key) => {
        key.addEventListener('mousedown', async () => {
            // Start audio on first interaction
            await startAudio();
            
            const note = key.getAttribute('data-note');
            if (note && synth) {
                console.log('Played note:', note);
                synth.triggerAttackRelease(note, '8n');
                key.classList.add('active');
                setTimeout(() => key.classList.remove('active'), 200);
            }
        });
    });
    console.log('✅ Piano keys ready');
    
    // KEYBOARD INPUT
    const pressedKeys = new Set();
    
    document.addEventListener('keydown', async (e) => {
        const key = e.key.toLowerCase();
        
        // Prevent repeat firing
        if (pressedKeys.has(key)) return;
        pressedKeys.add(key);
        
        const note = keyboardMap[key];
        if (note) {
            // Start audio on first interaction
            await startAudio();
            
            if (synth) {
                console.log('Keyboard note:', note);
                synth.triggerAttackRelease(note, '8n');
                
                // Visual feedback
                const keyElement = document.querySelector(`[data-note="${note}"]`);
                if (keyElement) {
                    keyElement.classList.add('active');
                }
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        pressedKeys.delete(key);
        
        const note = keyboardMap[key];
        if (note) {
            const keyElement = document.querySelector(`[data-note="${note}"]`);
            if (keyElement) {
                keyElement.classList.remove('active');
            }
        }
    });
    console.log('✅ Keyboard input ready');
    
    // RECORDING BUTTONS
    const startRecordBtn = document.getElementById('startRecordBtn');
    if (startRecordBtn) {
        startRecordBtn.addEventListener('click', startRecording);
        console.log('✅ Start record button ready');
    }
    
    const stopRecordBtn = document.getElementById('stopRecordBtn');
    if (stopRecordBtn) {
        stopRecordBtn.addEventListener('click', stopRecording);
        console.log('✅ Stop record button ready');
    }
    
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadRecording);
        console.log('✅ Download button ready');
    }
    
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearRecording);
        console.log('✅ Clear button ready');
    }
    
    // GUIDE & SETTINGS TOGGLES
    const guideToggle = document.getElementById('guideToggle');
    if (guideToggle) {
        guideToggle.addEventListener('click', () => {
            const section = document.getElementById('guideSection');
            if (section) {
                section.classList.toggle('hidden');
                console.log('Guide section toggled');
            }
        });
        console.log('✅ Guide toggle ready');
    }
    
    const settingsToggle = document.getElementById('settingsToggle');
    if (settingsToggle) {
        settingsToggle.addEventListener('click', () => {
            const section = document.getElementById('settingsSection');
            if (section) {
                section.classList.toggle('hidden');
                console.log('Settings section toggled');
            }
        });
        console.log('✅ Settings toggle ready');
    }
    
    console.log('✅ All event listeners attached!');
}

// ============================================================
// RECORDING FUNCTIONS
// ============================================================

function startRecording() {
    console.log('Starting recording...');
    
    if (!mediaStream) {
        alert('❌ Audio stream not ready. Refresh the page.');
        return;
    }

    recordedChunks = [];
    recordedBlob = null;
    
    try {
        recorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
        
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };
        
        recorder.start();
        isRecording = true;
        
        // Update button states
        document.getElementById('startRecordBtn').disabled = true;
        document.getElementById('stopRecordBtn').disabled = false;
        document.getElementById('downloadBtn').disabled = true;
        document.getElementById('recordingStatus').textContent = '🔴 Recording...';
        
        // Auto-stop after loop duration
        const loopDuration = (60000 / currentTempo) * loopBeats;
        console.log('Recording for', loopDuration, 'ms');
        
        setTimeout(() => {
            if (isRecording) {
                stopRecording();
            }
        }, loopDuration);
        
    } catch (error) {
        alert('❌ Recording error: ' + error.message);
        console.error('Recording error:', error);
    }
}

function stopRecording() {
    console.log('Stopping recording...');
    
    if (!recorder || !isRecording) {
        console.log('Not recording');
        return;
    }
    
    isRecording = false;
    
    recorder.onstop = () => {
        recordedBlob = new Blob(recordedChunks, { type: 'audio/webm' });
        console.log('✅ Recording stopped, size:', recordedBlob.size);
        
        document.getElementById('startRecordBtn').disabled = false;
        document.getElementById('stopRecordBtn').disabled = true;
        document.getElementById('downloadBtn').disabled = false;
        document.getElementById('recordingStatus').textContent = '✅ Ready to download';
    };
    
    recorder.stop();
}

function downloadRecording() {
    console.log('Downloading recording...');
    
    if (!recordedBlob) {
        alert('❌ No recording available');
        return;
    }
    
    const url = URL.createObjectURL(recordedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `music-loop-${Date.now()}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ Download started');
    document.getElementById('recordingStatus').textContent = '💾 Downloaded!';
}

function clearRecording() {
    console.log('Clearing recording...');
    
    recordedChunks = [];
    recordedBlob = null;
    isRecording = false;
    
    document.getElementById('startRecordBtn').disabled = false;
    document.getElementById('stopRecordBtn').disabled = true;
    document.getElementById('downloadBtn').disabled = true;
    document.getElementById('recordingStatus').textContent = '🗑️ Cleared';
}

// ============================================================
// START APP ON PAGE LOAD
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    
    // Check if Tone.js is loaded
    if (typeof Tone === 'undefined') {
        console.error('❌ Tone.js not loaded!');
        alert('Error: Tone.js library failed to load. Please check your internet connection and refresh the page.');
        return;
    }
    
    console.log('✅ Tone.js loaded, version:', Tone.version);
    init();
});
