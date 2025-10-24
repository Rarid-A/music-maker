// PROJECT MANAGER - Save/Load project functionality
class ProjectManager {
    constructor(channelManager, sequencer, effectsManager) {
        this.channelManager = channelManager;
        this.sequencer = sequencer;
        this.effectsManager = effectsManager;
    }

    exportProject() {
        // Stop playback if playing
        const wasPlaying = this.sequencer.getIsPlaying();
        if (wasPlaying) {
            Tone.Transport.stop();
            Tone.Transport.cancel(); // Cancel all scheduled events immediately
            this.sequencer.stopSequencer();
            this.sequencer.isPlaying = false;
            this.channelManager.releaseAllNotes();
        }
        
        const project = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            tempo: this.sequencer.currentTempo,
            gridSize: this.sequencer.getGridSize(),
            barCount: this.sequencer.getBarCount(),
            channels: this.channelManager.getChannels().map(channel => ({
                id: channel.id,
                name: channel.name,
                instrumentType: channel.instrumentType,
                waveType: channel.waveType,
                volume: channel.volume,
                muted: channel.muted,
                attack: channel.attack,
                release: channel.release,
                pattern: channel.pattern,
                effects: this.effectsManager ? this.effectsManager.getEffectSettings(channel.id) : null
            })),
            selectedChannelId: this.channelManager.getSelectedChannelId()
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
        URL.revokeObjectURL(url);

        alert('✅ Project saved successfully!');
    }

    importProject() {
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
                if (!project.version || !project.channels) {
                    throw new Error('Invalid project file format');
                }

                // Stop playback if playing
                if (this.sequencer.getIsPlaying()) {
                    Tone.Transport.stop();
                    Tone.Transport.cancel(); // Cancel all scheduled events immediately
                    this.sequencer.stopSequencer();
                    this.sequencer.isPlaying = false;
                    this.channelManager.releaseAllNotes();
                }

                // Clear existing channels
                const existingChannels = [...this.channelManager.getChannels()];
                for (const channel of existingChannels) {
                    this.channelManager.removeChannel(channel.id);
                }

                // Wait for cleanup
                await new Promise(resolve => setTimeout(resolve, 100));

                // Reset sequencer settings
                this.sequencer.setTempo(project.tempo || 120);
                this.sequencer.setGridSize(project.gridSize || 16);
                this.sequencer.setBarCount(project.barCount || 1);

                // Recreate channels
                for (const channelData of project.channels) {
                    const channel = this.channelManager.addChannel(
                        channelData.name,
                        channelData.instrumentType,
                        channelData.waveType
                    );

                    if (channel) {
                        // Restore channel settings
                        this.channelManager.updateChannel(channel.id, 'volume', channelData.volume);
                        this.channelManager.updateChannel(channel.id, 'muted', channelData.muted);
                        this.channelManager.updateChannel(channel.id, 'attack', channelData.attack);
                        this.channelManager.updateChannel(channel.id, 'release', channelData.release);
                        
                        // Restore pattern
                        channel.pattern = channelData.pattern || [];
                        
                        // Restore effects
                        if (channelData.effects && this.effectsManager) {
                            this.effectsManager.setEffectSettings(channel.id, channelData.effects);
                        }
                    }
                }

                // Restore selected channel
                if (project.selectedChannelId) {
                    this.channelManager.selectChannel(project.selectedChannelId);
                }

                // Update UI
                if (window.app && window.app.uiManager) {
                    window.app.uiManager.renderChannels();
                    window.app.uiManager.renderMixerChannels();
                    window.app.uiManager.renderSequencerGrid();
                }

                // Update tempo display
                const tempoInput = document.getElementById('tempoInput');
                if (tempoInput) {
                    tempoInput.value = project.tempo || 120;
                }

                // Update grid/bar selects
                const gridSelect = document.getElementById('gridSelect');
                if (gridSelect) {
                    gridSelect.value = (project.gridSize || 16).toString();
                }

                const barsSelect = document.getElementById('barsSelect');
                if (barsSelect) {
                    barsSelect.value = (project.barCount || 1).toString();
                }

                alert('✅ Project loaded successfully!');
            } catch (error) {
                console.error('Error loading project:', error);
                alert('❌ Error loading project: ' + error.message);
            }
        };

        input.click();
    }
}

// Export for use in other modules
window.ProjectManager = ProjectManager;
