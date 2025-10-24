// EFFECTS MODULE - Audio effects management
class EffectsManager {
    constructor() {
        this.effects = new Map(); // Map of channelId -> { reverb, delay, filter }
    }

    createEffectsChain(channelId) {
        // Create effects for a channel
        const reverb = new Tone.Reverb({
            decay: 1.5,
            wet: 0
        }).toDestination();
        
        const delay = new Tone.FeedbackDelay({
            delayTime: '8n',
            feedback: 0.3,
            wet: 0
        }).toDestination();
        
        const filter = new Tone.Filter({
            type: 'lowpass',
            frequency: 20000,
            Q: 1
        }).toDestination();
        
        this.effects.set(channelId, { reverb, delay, filter });
        
        return { reverb, delay, filter };
    }

    connectInstrumentToEffects(instrument, channelId) {
        const effects = this.effects.get(channelId);
        if (!effects) {
            console.warn('No effects found for channel:', channelId);
            return instrument;
        }

        // Disconnect from destination first
        try {
            instrument.disconnect();
        } catch (e) {
            // Instrument might not be connected yet
        }

        // Connect instrument -> filter -> delay -> reverb -> destination
        instrument.chain(effects.filter, effects.delay, effects.reverb, Tone.Destination);
        
        return instrument;
    }

    updateEffect(channelId, effectType, parameter, value) {
        const effects = this.effects.get(channelId);
        if (!effects) return;

        try {
            if (effectType === 'reverb') {
                if (parameter === 'wet') {
                    effects.reverb.wet.value = value;
                } else if (parameter === 'decay') {
                    effects.reverb.decay = value;
                }
            } else if (effectType === 'delay') {
                if (parameter === 'wet') {
                    effects.delay.wet.value = value;
                } else if (parameter === 'feedback') {
                    effects.delay.feedback.value = value;
                } else if (parameter === 'time') {
                    effects.delay.delayTime.value = value;
                }
            } else if (effectType === 'filter') {
                if (parameter === 'frequency') {
                    effects.filter.frequency.value = value;
                } else if (parameter === 'type') {
                    effects.filter.type = value;
                } else if (parameter === 'q') {
                    effects.filter.Q.value = value;
                }
            }
        } catch (error) {
            console.error('Error updating effect:', error);
        }
    }

    getEffects(channelId) {
        return this.effects.get(channelId);
    }

    removeEffects(channelId) {
        const effects = this.effects.get(channelId);
        if (effects) {
            try {
                effects.reverb.dispose();
                effects.delay.dispose();
                effects.filter.dispose();
            } catch (error) {
                console.error('Error disposing effects:', error);
            }
            this.effects.delete(channelId);
        }
    }

    getEffectSettings(channelId) {
        const effects = this.effects.get(channelId);
        if (!effects) return null;

        return {
            reverb: {
                wet: effects.reverb.wet.value,
                decay: effects.reverb.decay
            },
            delay: {
                wet: effects.delay.wet.value,
                feedback: effects.delay.feedback.value,
                time: effects.delay.delayTime.value
            },
            filter: {
                frequency: effects.filter.frequency.value,
                type: effects.filter.type,
                q: effects.filter.Q.value
            }
        };
    }

    setEffectSettings(channelId, settings) {
        if (!settings) return;
        
        if (settings.reverb) {
            this.updateEffect(channelId, 'reverb', 'wet', settings.reverb.wet || 0);
            this.updateEffect(channelId, 'reverb', 'decay', settings.reverb.decay || 1.5);
        }
        
        if (settings.delay) {
            this.updateEffect(channelId, 'delay', 'wet', settings.delay.wet || 0);
            this.updateEffect(channelId, 'delay', 'feedback', settings.delay.feedback || 0.3);
            this.updateEffect(channelId, 'delay', 'time', settings.delay.time || 0.25);
        }
        
        if (settings.filter) {
            this.updateEffect(channelId, 'filter', 'frequency', settings.filter.frequency || 20000);
            this.updateEffect(channelId, 'filter', 'type', settings.filter.type || 'lowpass');
            this.updateEffect(channelId, 'filter', 'q', settings.filter.q || 1);
        }
    }
}

// Export for use in other modules
window.EffectsManager = EffectsManager;
