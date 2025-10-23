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

const keyboardMap = {'a':'C4','w':'C#4','s':'D4','e':'D#4','d':'E4','f':'F4','t':'F#4','g':'G4','y':'G#4','h':'A4','u':'A#4','j':'B4','k':'C5'};
const notes = ['C5', 'B4', 'A#4', 'A4', 'G#4', 'G4', 'F#4', 'F4', 'E4', 'D#4', 'D4', 'C#4', 'C4'];
const drumLabels = ['kick', 'snare', 'hihat', 'clap'];
let sequencerLoop = null;
let currentStep = 0;

async function startAudio() {
    if (audioStarted) return;
    try {
        await Tone.start();
        audioStarted = true;
        setupRecording();
        addChannel('Lead', 'sine');
        console.log('Audio started');
    } catch (error) {
        alert('Error starting audio: ' + error.message);
    }
}

function setupRecording() {
    try {
        const toneContext = Tone.getContext();
        const audioContext = toneContext.rawContext || toneContext._context;
        mediaStreamDestination = audioContext.createMediaStreamDestination();
        mediaStream = mediaStreamDestination.stream;
    } catch (error) {
        console.error('Recording setup error:', error);
    }
}

function init() {
    Tone.Transport.bpm.value = currentTempo;
    Tone.Transport.loop = true;
    Tone.Transport.loopEnd = "4m";
    setupEventListeners();
}

function addChannel(name, instrumentType = 'synth', waveType = 'sine') {
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
            resonance: 0.7
        }).toDestination();
        if (mediaStreamDestination) instrument.connect(mediaStreamDestination);
        instrument.volume.value = -10;
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
        pattern: Array(16).fill(null).map(() => ({})) // 16-step pattern
    };
    channels.push(channel);
    renderChannels();
    renderMixerChannels();
    selectChannel(id);
    return channel;
}

function selectChannel(id) {
    selectedChannel = id;
    selectedChannelId = id;
    renderChannels();
    renderSequencerGrid();
}

function getSelectedChannel() {
    return channels.find(ch => ch.id === selectedChannelId);
}

function playNote(channel, note, time = undefined) {
    if (channel.instrumentType === 'drums') {
        return; // Drums don't play notes
    }
    
    if (channel.instrumentType === 'bass' || channel.instrumentType === 'pluck') {
        channel.synth.triggerAttackRelease(note, '8n', time);
    } else {
        channel.synth.triggerAttackRelease(note, '8n', time);
    }
}

function playDrum(channel, drumType, time = undefined) {
    if (channel.instrumentType !== 'drums') return;
    
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
}

function showInstrumentDialog() {
    const instrumentType = prompt(
        'Choose instrument type:\n\n' +
        '1 - Synth (Lead/Melody)\n' +
        '2 - Bass\n' +
        '3 - Pad (Ambient)\n' +
        '4 - Pluck (Guitar-like)\n' +
        '5 - Drums\n\n' +
        'Enter number (1-5):',
        '1'
    );
    
    if (!instrumentType) return;
    
    const types = {
        '1': { type: 'synth', name: 'Lead' },
        '2': { type: 'bass', name: 'Bass' },
        '3': { type: 'pad', name: 'Pad' },
        '4': { type: 'pluck', name: 'Pluck' },
        '5': { type: 'drums', name: 'Drums' }
    };
    
    const selected = types[instrumentType];
    if (!selected) {
        alert('Invalid choice');
        return;
    }
    
    const name = prompt('Channel name:', `${selected.name} ${channels.length + 1}`);
    if (name) {
        addChannel(name, selected.type, 'sine');
    }
}

function updateChannel(id, property, value) {
    const channel = channels.find(ch => ch.id === id);
    if (!channel) return;
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
            channel.synth.set({ oscillator: { type: value } });
        } else if (property === 'volume') {
            channel.synth.volume.value = -20 + (value * 20);
        } else if (property === 'muted') {
            channel.synth.volume.value = value ? -Infinity : -20 + (channel.volume * 20);
        } else if (property === 'attack' || property === 'release') {
            channel.synth.set({ envelope: { attack: channel.attack / 1000, release: channel.release / 1000 } });
        }
    }
    renderMixerChannels();
}

function removeChannel(id) {
    const index = channels.findIndex(ch => ch.id === id);
    if (index === -1) return;
    channels[index].synth.dispose();
    channels.splice(index, 1);
    if (selectedChannelId === id && channels.length > 0) selectedChannelId = channels[0].id;
    renderChannels();
    renderMixerChannels();
}

function renderChannels() {
    const channelsList = document.getElementById('channelsList');
    if (!channelsList) return;
    channelsList.innerHTML = '';
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
                    <select onchange="updateChannel(${channel.id}, 'waveType', this.value)" onclick="event.stopPropagation()" ${channel.instrumentType !== 'synth' ? 'disabled' : ''}>
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
        channelsList.appendChild(div);
    });
}

function renderMixerChannels() {
    const mixerChannels = document.getElementById('mixerChannels');
    if (!mixerChannels) return;
    mixerChannels.innerHTML = '';
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
        mixerChannels.appendChild(div);
    });
}

function renderSequencerGrid() {
    const grid = document.getElementById('sequencerGrid');
    if (!grid || !selectedChannel) return;
    
    grid.innerHTML = '';
    const channel = channels.find(c => c.id === selectedChannel);
    if (!channel) return;
    
    document.getElementById('selectedChannelName').textContent = channel.name;
    
    const rowLabels = channel.instrumentType === 'drums' ? drumLabels : notes;
    
    rowLabels.forEach((label, rowIndex) => {
        const row = document.createElement('div');
        row.className = 'sequencer-row';
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'sequencer-label';
        // Capitalize first letter for drums
        labelDiv.textContent = channel.instrumentType === 'drums' 
            ? label.charAt(0).toUpperCase() + label.slice(1) 
            : label;
        row.appendChild(labelDiv);
        
        for (let stepIndex = 0; stepIndex < 16; stepIndex++) {
            const step = document.createElement('div');
            step.className = 'sequencer-step';
            if (stepIndex % 4 === 0) step.classList.add('beat');
            
            const isActive = channel.pattern[stepIndex][label];
            if (isActive) step.classList.add('active');
            
            step.addEventListener('click', () => {
                channel.pattern[stepIndex][label] = !channel.pattern[stepIndex][label];
                step.classList.toggle('active');
            });
            
            row.appendChild(step);
        }
        
        grid.appendChild(row);
    });
}

function startSequencer() {
    if (sequencerLoop) return;
    
    currentStep = 0;
    sequencerLoop = new Tone.Loop((time) => {
        channels.forEach(channel => {
            const step = channel.pattern[currentStep];
            if (channel.instrumentType === 'drums') {
                drumLabels.forEach(drumType => {
                    if (step[drumType]) {
                        playDrum(channel, drumType, time);
                    }
                });
            } else {
                notes.forEach(note => {
                    if (step[note]) {
                        playNote(channel, note, time);
                    }
                });
            }
        });
        
        // Visual feedback
        Tone.Draw.schedule(() => {
            document.querySelectorAll('.sequencer-step').forEach((el, index) => {
                const stepPos = index % 16;
                if (stepPos === currentStep) {
                    el.style.borderColor = '#667eea';
                } else {
                    el.style.borderColor = '#333';
                }
            });
        }, time);
        
        currentStep = (currentStep + 1) % 16;
    }, '16n');
    
    sequencerLoop.start(0);
}

function stopSequencer() {
    if (sequencerLoop) {
        sequencerLoop.stop();
        sequencerLoop.dispose();
        sequencerLoop = null;
    }
    currentStep = 0;
    document.querySelectorAll('.sequencer-step').forEach(el => {
        el.style.borderColor = '#333';
    });
}

function setupEventListeners() {
    document.getElementById('addChannelBtn')?.addEventListener('click', async () => {
        await startAudio();
        showInstrumentDialog();
    });
    
    document.getElementById('tempoInput')?.addEventListener('input', (e) => {
        currentTempo = parseInt(e.target.value);
        Tone.Transport.bpm.value = currentTempo;
    });
    
    document.getElementById('playBtn')?.addEventListener('click', togglePlay);
    document.getElementById('stopBtn')?.addEventListener('click', stop);
    document.getElementById('recordBtn')?.addEventListener('click', toggleRecord);
    document.getElementById('downloadBtn')?.addEventListener('click', () => alert('Recording will auto-download when stopped'));
    
    document.getElementById('guideToggle')?.addEventListener('click', () => {
        document.getElementById('guideOverlay')?.classList.toggle('hidden');
    });
    document.getElementById('closeGuide')?.addEventListener('click', () => {
        document.getElementById('guideOverlay')?.classList.add('hidden');
    });
    
    document.querySelectorAll('.white-key, .black-key').forEach(key => {
        key.addEventListener('mousedown', async () => {
            await startAudio();
            const note = key.getAttribute('data-note');
            const channel = getSelectedChannel();
            if (note && channel) {
                playNote(channel, note);
                key.classList.add('active');
                setTimeout(() => key.classList.remove('active'), 200);
            }
        });
    });
    
    const pressedKeys = new Set();
    const drumKeys = { 'z': 'kick', 'x': 'snare', 'c': 'hihat', 'v': 'clap' };
    
    document.addEventListener('keydown', async (e) => {
        if (e.code === 'Space') { e.preventDefault(); togglePlay(); return; }
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

async function toggleRecord() {
    await startAudio();
    if (isRecording) stopRecording();
    else startRecording();
}

function startRecording() {
    if (!mediaStream) { alert('Audio stream not ready'); return; }
    recordedChunks = [];
    try {
        recorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
        recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
        recorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            convertAndDownloadMP3(blob);
        };
        recorder.start();
        isRecording = true;
        document.getElementById('recordBtn')?.classList.add('active');
        if (!isPlaying) { Tone.Transport.start(); isPlaying = true; }
    } catch (error) {
        alert('Recording error: ' + error.message);
    }
}

function stopRecording() {
    if (!recorder || !isRecording) return;
    recorder.stop();
    isRecording = false;
    document.getElementById('recordBtn')?.classList.remove('active');
}

async function convertAndDownloadMP3(webmBlob) {
    try {
        const mp3Blob = await convertToMp3(webmBlob);
        const url = URL.createObjectURL(mp3Blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `music-${Date.now()}.mp3`;
        link.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('MP3 conversion failed:', error);
        const url = URL.createObjectURL(webmBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `music-${Date.now()}.webm`;
        link.click();
        URL.revokeObjectURL(url);
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

document.addEventListener('DOMContentLoaded', () => {
    if (typeof Tone === 'undefined') { alert('Tone.js not loaded'); return; }
    init();
});
