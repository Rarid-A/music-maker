// MAIN APP - Coordination and initialization
class MusicStudioApp {
    constructor() {
        this.audioManager = new AudioManager();
        this.effectsManager = new EffectsManager();
        this.channelManager = new ChannelManager(this.audioManager);
        this.channelManager.setEffectsManager(this.effectsManager);
        this.sequencer = new Sequencer(this.channelManager);
        this.uiManager = new UIManager(this.channelManager, this.sequencer);
        this.exportManager = new ExportManager(this.audioManager, this.channelManager, this.sequencer);
        this.projectManager = new ProjectManager(this.channelManager, this.sequencer, this.effectsManager);
        
        // Undo/Redo functionality
        this.undoStack = [];
        this.redoStack = [];
        this.MAX_UNDO_STACK = 50;
        
        // Track if initial demo has been loaded
        this.initialDemoLoaded = false;
        
        // Make sequencer available globally for channel manager
        window.sequencer = this.sequencer;
    }

    async init() {
        this.sequencer.init();
        this.setupEventListeners();
        
        // Update the bars select to show the correct initial value
        const barsSelect = document.getElementById('barsSelect');
        if (barsSelect) {
            barsSelect.value = this.sequencer.getBarCount().toString();
        }
        
        // Auto-initialize audio and create demo setup on page load
        await this.initializeAudioAndDemo();
    }

    async initializeAudioAndDemo() {
        try {
            this.audioManager.showLoadingIndicator(true, 'Loading Music Studio...');
            
            // Start audio context
            await this.audioManager.startAudio();
            
            // Create demo setup only if not already loaded
            if (!this.initialDemoLoaded) {
                this.uiManager.createDemoSetup();
                this.initialDemoLoaded = true;
            }
            
            this.audioManager.showLoadingIndicator(false);
        } catch (error) {
            console.error('Initialization error:', error);
            this.audioManager.showLoadingIndicator(false);
            
            // If auto-start fails (some browsers require user interaction), show simple message
            this.uiManager.showStartPrompt();
        }
    }

    setupEventListeners() {
        document.getElementById('addChannelBtn')?.addEventListener('click', async () => {
            await this.audioManager.startAudio();
            this.uiManager.showInstrumentDialog();
        });
        
        // Presets dropdown
        document.getElementById('presetsDropdown')?.addEventListener('change', async (e) => {
            const presetValue = e.target.value;
            if (presetValue) {
                // Ensure audio is started
                await this.audioManager.startAudio();
                
                // Mark that initial demo has been loaded (even if we're replacing it)
                this.initialDemoLoaded = true;
                
                // Stop playback BEFORE showing confirm dialog
                if (this.sequencer.getIsPlaying()) {
                    this.sequencer.stop();
                }
                
                if (confirm(`Load "${e.target.options[e.target.selectedIndex].text}" preset? This will clear your current work.`)) {
                    // Load the preset
                    this.uiManager.loadPreset(presetValue);
                } else {
                    // User cancelled - restart if it was playing
                    // (optional: uncomment if you want music to resume on cancel)
                    // await this.sequencer.togglePlay();
                }
                
                // Reset dropdown to default
                e.target.value = '';
            }
        });
        
        // Prevent default behavior to avoid scrolling when focused
        document.getElementById('tempoInput')?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            // Edge case: Clamp tempo value
            const clampedValue = Math.max(40, Math.min(200, value || 120));
            if (!isNaN(clampedValue)) {
                this.sequencer.setTempo(clampedValue);
                e.target.value = clampedValue;
            }
        });
        
        document.getElementById('swingInput')?.addEventListener('input', (e) => {
            const swing = parseInt(e.target.value) / 100; // Convert 0-66 to 0-0.66
            this.sequencer.setSwing(swing);
        });
        
        document.getElementById('gridSelect')?.addEventListener('change', (e) => {
            this.saveUndoState();
            this.sequencer.setGridSize(parseInt(e.target.value));
            
            // Restart sequencer if playing to prevent issues with note timing
            if (this.sequencer.getIsPlaying()) {
                this.sequencer.stopSequencer();
                Tone.Transport.stop();
                this.sequencer.currentStep = 0;
                Tone.Transport.start();
                this.sequencer.startSequencer();
            }
            
            // Use requestAnimationFrame to prevent lag
            requestAnimationFrame(() => {
                this.uiManager.renderSequencerGrid();
            });
        });
        
        document.getElementById('barsSelect')?.addEventListener('change', (e) => {
            this.saveUndoState();
            this.sequencer.setBarCount(parseInt(e.target.value));
            
            // Restart sequencer if playing to prevent currentStep from being out of bounds
            if (this.sequencer.getIsPlaying()) {
                this.sequencer.stopSequencer();
                Tone.Transport.stop();
                this.sequencer.currentStep = 0;
                Tone.Transport.start();
                this.sequencer.startSequencer();
            }
            
            // Use requestAnimationFrame to prevent lag
            requestAnimationFrame(() => {
                this.uiManager.renderSequencerGrid();
            });
        });
        
        document.getElementById('playBtn')?.addEventListener('click', () => this.sequencer.togglePlay());
        document.getElementById('stopBtn')?.addEventListener('click', () => this.sequencer.stop());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportManager.exportLoop());
        document.getElementById('exportMidiBtn')?.addEventListener('click', () => this.exportManager.exportMIDI());
        document.getElementById('saveProjectBtn')?.addEventListener('click', () => this.projectManager.exportProject());
        document.getElementById('loadProjectBtn')?.addEventListener('click', () => this.projectManager.importProject());
        
        // Toggle piano keyboard visibility
        document.getElementById('togglePianoBtn')?.addEventListener('click', () => {
            const pianoKeyboard = document.querySelector('.piano-keyboard');
            const toggleBtn = document.getElementById('togglePianoBtn');
            
            if (pianoKeyboard) {
                pianoKeyboard.classList.toggle('collapsed');
                const isCollapsed = pianoKeyboard.classList.contains('collapsed');
                if (toggleBtn) {
                    toggleBtn.textContent = isCollapsed ? '🎹 Show Piano' : '🎹 Hide Piano';
                }
            }
        });
        
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
                await this.audioManager.startAudio();
                const note = key.getAttribute('data-note');
                const channel = this.channelManager.getSelectedChannel();
                if (note && channel) {
                    this.channelManager.playNote(channel, note);
                    key.classList.add('active');
                    setTimeout(() => key.classList.remove('active'), 300);
                }
            });
            
            // Touch events for mobile
            key.addEventListener('touchstart', async (e) => {
                e.preventDefault();
                await this.audioManager.startAudio();
                const note = key.getAttribute('data-note');
                const channel = this.channelManager.getSelectedChannel();
                if (note && channel) {
                    this.channelManager.playNote(channel, note);
                    key.classList.add('active');
                    setTimeout(() => key.classList.remove('active'), 300);
                }
            });
            
            // Keyboard support
            key.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    await this.audioManager.startAudio();
                    const note = key.getAttribute('data-note');
                    const channel = this.channelManager.getSelectedChannel();
                    if (note && channel) {
                        this.channelManager.playNote(channel, note);
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
                this.sequencer.togglePlay(); 
                return; 
            }
            
            // Delete key - clear pattern for selected channel
            if (e.key === 'Delete' && this.channelManager.getSelectedChannelId()) {
                e.preventDefault();
                this.sequencer.clearPattern();
                this.uiManager.renderSequencerGrid();
                return;
            }
            
            // Ctrl+C - Copy pattern
            if (e.ctrlKey && e.key === 'c' && !e.shiftKey) {
                e.preventDefault();
                this.sequencer.copyPattern();
                return;
            }
            
            // Ctrl+V - Paste pattern
            if (e.ctrlKey && e.key === 'v' && !e.shiftKey) {
                e.preventDefault();
                this.sequencer.pastePattern();
                return;
            }
            
            // Ctrl+Z - Undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
                return;
            }
            
            // Ctrl+Shift+Z or Ctrl+Y - Redo
            if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
                e.preventDefault();
                this.redo();
                return;
            }
            
            // Escape - Stop playback
            if (e.key === 'Escape') {
                e.preventDefault();
                this.sequencer.stop();
                return;
            }
            
            const key = e.key.toLowerCase();
            if (pressedKeys.has(key)) return;
            pressedKeys.add(key);
            
            await this.audioManager.startAudio();
            const channel = this.channelManager.getSelectedChannel();
            if (!channel || channel.muted) return;
            
            // Check if it's a drum key
            if (drumKeys[key] && channel.instrumentType === 'drums') {
                this.channelManager.playDrum(channel, drumKeys[key]);
            } else {
                const note = this.uiManager.getKeyboardMap()[key];
                if (note) {
                    this.channelManager.playNote(channel, note);
                    document.querySelector(`[data-note="${note}"]`)?.classList.add('active');
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            pressedKeys.delete(key);
            const note = this.uiManager.getKeyboardMap()[key];
            if (note) document.querySelector(`[data-note="${note}"]`)?.classList.remove('active');
        });
        
        document.getElementById('masterVolume')?.addEventListener('input', (e) => {
            Tone.Destination.volume.value = -20 + (parseFloat(e.target.value) * 20);
            document.getElementById('masterVolumeLabel').textContent = Math.round(parseFloat(e.target.value)*100) + '%';
        });
    }

    // Undo/Redo functionality
    saveUndoState() {
        const state = {
            channels: JSON.parse(JSON.stringify(this.channelManager.getChannels().map(ch => ({
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
            selectedChannelId: this.channelManager.getSelectedChannelId(),
            gridSize: this.sequencer.getGridSize(),
            barCount: this.sequencer.getBarCount()
        };
        
        this.undoStack.push(state);
        if (this.undoStack.length > this.MAX_UNDO_STACK) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo stack on new action
    }

    undo() {
        if (this.undoStack.length === 0) {
            // Silent fail for better UX
            return;
        }
        
        // Save current state to redo stack
        const currentState = {
            channels: JSON.parse(JSON.stringify(this.channelManager.getChannels().map(ch => ({
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
            selectedChannelId: this.channelManager.getSelectedChannelId(),
            gridSize: this.sequencer.getGridSize(),
            barCount: this.sequencer.getBarCount()
        };
        this.redoStack.push(currentState);
        
        // Restore previous state
        const state = this.undoStack.pop();
        this.restoreState(state);
    }

    redo() {
        if (this.redoStack.length === 0) {
            // Silent fail for better UX
            return;
        }
        
        // Save current state to undo stack
        this.saveUndoState();
        
        // Restore redo state
        const state = this.redoStack.pop();
        this.restoreState(state);
    }

    restoreState(state) {
        // This is a simplified restore - in production you'd need to recreate instruments
        this.channelManager.setSelectedChannelId(state.selectedChannelId);
        this.sequencer.setGridSize(state.gridSize);
        this.sequencer.setBarCount(state.barCount);
        
        // Update patterns only (instruments remain)
        state.channels.forEach(savedChannel => {
            const channel = this.channelManager.getChannels().find(ch => ch.id === savedChannel.id);
            if (channel) {
                channel.pattern = savedChannel.pattern;
                channel.volume = savedChannel.volume;
                channel.muted = savedChannel.muted;
            }
        });
        
        this.sequencer.updateLoopEnd();
        
        // Batch all UI updates together
        requestAnimationFrame(() => {
            this.uiManager.renderChannels();
            this.uiManager.renderMixerChannels();
            this.uiManager.renderSequencerGrid();
        });
    }

    // Global functions for inline event handlers
    updateChannel(id, property, value) {
        this.channelManager.updateChannel(id, property, value);
        
        // Only re-render mixer if volume or mute changed (avoid unnecessary re-renders)
        if (property === 'volume' || property === 'muted') {
            requestAnimationFrame(() => {
                this.uiManager.renderMixerChannels();
            });
        }
    }

    removeChannel(id) {
        // Pause playback to prevent stuck notes
        const wasPlaying = this.sequencer.getIsPlaying();
        if (wasPlaying) {
            Tone.Transport.stop();
            this.sequencer.stopSequencer();
            this.sequencer.isPlaying = false;
            // Release all notes from all instruments
            this.channelManager.releaseAllNotes();
        }
        
        // Save state for undo
        this.saveUndoState();
        
        this.channelManager.removeChannel(id);
        
        // Use requestAnimationFrame to prevent lag
        requestAnimationFrame(() => {
            this.uiManager.renderChannels();
            this.uiManager.renderMixerChannels();
            this.uiManager.renderSequencerGrid();
        });
        
        // Resume playback if it was playing
        if (wasPlaying) {
            setTimeout(() => {
                Tone.Transport.start();
                this.sequencer.startSequencer();
                this.sequencer.isPlaying = true;
            }, 100);
        }
    }
}

// Initialize the app
let app;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof Tone === 'undefined') { 
        alert('Tone.js library failed to load. Please check your internet connection.'); 
        return; 
    }
    
    app = new MusicStudioApp();
    window.app = app; // Make app globally available for inline handlers
    
    // Add spinner styles
    app.audioManager.addSpinnerStyles();
    
    app.init();
});