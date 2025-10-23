# Music Studio - Modular JavaScript Architecture

This directory contains the modular JavaScript files for the Music Studio DAW application.

## File Structure

### Core Modules

- **`audio.js`** - AudioManager class
  - Tone.js initialization and audio context management
  - Recording setup and media stream handling
  - Loading indicators and audio state management

- **`channels.js`** - ChannelManager class
  - Channel creation, management, and deletion
  - Instrument synthesis (drums, bass, synths, etc.)
  - Note and drum playback functionality
  - Channel property updates (volume, mute, etc.)

- **`sequencer.js`** - Sequencer class
  - Pattern sequencing and playback
  - Step management and grid control
  - Transport controls (play, pause, stop)
  - Tempo and timing management

- **`ui.js`** - UIManager class
  - DOM rendering and manipulation
  - Channel list, mixer, and sequencer grid rendering
  - User interface interactions
  - Demo setup and welcome messages

- **`export.js`** - ExportManager class
  - Audio recording and export functionality
  - MP3 conversion using Lame.js
  - File download management

### Main Application

- **`app.js`** - MusicStudioApp class
  - Main application coordination
  - Module initialization and dependency injection
  - Event listener setup
  - Undo/redo functionality
  - Global function exposure for inline handlers

## Architecture Benefits

1. **Separation of Concerns**: Each module handles a specific domain
2. **Maintainability**: Easier to locate and modify specific functionality
3. **Testability**: Individual modules can be tested in isolation
4. **Reusability**: Modules can be reused in other projects
5. **Debugging**: Easier to identify and fix issues in specific areas

## Module Dependencies

```
app.js (Main Coordinator)
├── audio.js (AudioManager)
├── channels.js (ChannelManager) → audio.js
├── sequencer.js (Sequencer) → channels.js
├── ui.js (UIManager) → channels.js, sequencer.js
└── export.js (ExportManager) → audio.js, channels.js, sequencer.js
```

## Usage

The modules are loaded in the correct dependency order in `index.html`:

1. External libraries (Tone.js, Lame.js)
2. Core modules (audio, channels, sequencer, ui, export)
3. Main application (app.js)

All modules expose their classes globally via `window` object for cross-module communication.
