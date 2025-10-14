# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js application for controlling Loupedeck devices (Live, Live S, CT) on Linux systems, built on top of the `foxxyz/loupedeck` library. It provides a component-based architecture for creating custom touchscreen interfaces with buttons, clocks, and other interactive elements.

## Development Commands

### Running the Application
```bash
npm start              # Run with info-level logging
npm run start:debug    # Run with debug-level logging
npm run start:prod     # Run in production mode
npm run dev            # Run in watch mode with debug logging
npm run dev:info       # Run in watch mode with info logging
```

### Code Quality
```bash
npm run lint           # Run ESLint to check for issues
npm run lint:fix       # Auto-fix ESLint issues
npm run format         # Format code with Prettier
npm run format:check   # Check code formatting
```

### Testing
```bash
node tests/test.js          # Basic device event testing
node tests/test-grid.js     # Grid layout testing
node tests/clock.js         # Clock component testing
node tests/debug.js         # Debug mode testing
node tests/test-volume.js   # Volume control testing
```

## Architecture

### Core Architecture Pattern

The application follows a **component-based architecture** with separation of concerns:

1. **Device Layer** (`src/device/`): Manages hardware connection and low-level device events
2. **Component Layer** (`src/components/`): Reusable UI components that render to canvas
3. **Utilities Layer** (`src/utils/`): Shared functionality (logging, text rendering, image loading, vibration)

### Key Classes and Their Relationships

**LoupedeckDevice** (`src/device/LoupedeckDevice.js`)
- Wraps the `loupedeck` library's device discovery and connection
- Manages event handlers for device events (touch, buttons, disconnect)
- Coordinates vibration feedback through `VibrationUtil`
- Handles graceful shutdown and cleanup
- Important: Converts raw touch coordinates to grid positions using `marginX` calculation

**Screen** (`src/components/Screen.js`)
- Base class for all screen layouts
- Manages grid calculations: `marginX`, `keySize`, columns/rows
- Provides `getCellCoordinates(col, row)` for positioning components
- Handles canvas drawing and updates via `device.drawScreen('center', callback)`

**GridLayout** (`src/components/GridLayout.js`)
- Extends `Screen` to manage multiple components
- Maintains `componentMap` (Map with `${col}_${row}` keys) for touch event routing
- Handles component drawing and touch event delegation
- Provides `startAutoUpdate(interval)` for periodic redraws

**Component Pattern** (Button, Clock, VolumeDisplay)
- Each component has `col`, `row` properties for grid positioning
- Implements `draw(ctx, cellCoord)` to render itself
- Implements `handleTouch(col, row)` to respond to user interaction
- Components are stateful and can update their appearance

**VolumeControl** (`src/utils/volumeControl.js`)
- System audio volume control wrapper
- Auto-detects PipeWire (wpctl) or PulseAudio (pactl)
- Provides methods: `setVolume()`, `adjustVolume()`, `increaseVolume()`, `decreaseVolume()`, `toggleMute()`
- Caches current volume state to minimize system calls

### Component Lifecycle

1. **Initialization**: Create components with position and configuration
2. **Registration**: Add to GridLayout via `addComponent()` or `addComponents()`
3. **Rendering**: GridLayout calls `draw(ctx, cellCoord)` on each component
4. **Event Handling**: Touches are routed through GridLayout's `componentMap` to the appropriate component
5. **Updates**: Use `startAutoUpdate(interval)` for periodic redraws (needed for Clock, etc.)

### Event Flow

**Touch Events:**
```
User Touch → Loupedeck Hardware
    ↓
Device 'touchstart' event (raw x, y coordinates)
    ↓
LoupedeckDevice.onTouch() (converts to col, row using marginX calculation)
    ↓
GridLayout.handleTouch(col, row) (looks up component in componentMap)
    ↓
Component.handleTouch(col, row) (executes onClick, vibration feedback)
```

**Knob Events:**
```
User Rotates Knob → Loupedeck Hardware
    ↓
Device 'rotate' event ({ id, delta })
    ↓
Custom handler (e.g., volume adjustment)
    ↓
VolumeControl.adjustVolume(delta * step)
    ↓
GridLayout.update() (refresh display)
```

## Important Implementation Details

### Touch Coordinate Calculation
The device screen has horizontal margins. Touch coordinates must be adjusted:
```javascript
const marginX = (screenWidth - totalWidth) / 2
const col = Math.floor((x - marginX) / keySize)
const row = Math.floor(y / keySize)
```
This is handled in `LoupedeckDevice.onTouch()` at src/device/LoupedeckDevice.js:102

### Canvas Drawing
All drawing happens through the device's `drawScreen()` method:
```javascript
await device.drawScreen('center', (ctx) => {
  // Canvas 2D drawing context operations
})
```

### Logging System
Uses `pino` logger with environment-based configuration:
- Development: Pretty-printed, colorized output
- Production: JSON format
- Control level via `LOG_LEVEL` environment variable (debug, info, warn, error)
- Access via `import { logger } from './src/utils/logger.js'`

### Image Loading
Images are cached automatically by `imageLoader.js`:
- Use `loadImageFile(path)` to load images (accepts relative or absolute paths)
- Use `drawImage(ctx, image, x, y, width, height, keepAspectRatio)` to render
- Images are resolved relative to project root

### Vibration Feedback
Predefined patterns in `src/utils/vibration.js`:
- `tap`: Short button press (30ms)
- `success`: Confirmation pattern (50, 80, 50ms)
- `error`: Long error buzz (200ms)
- `connect`: Device connection pattern
- Add to components via `vibration` and `vibrationPattern` options

### Exit Handling
The application implements graceful shutdown:
- `LoupedeckDevice.setupExitHandlers(cleanupCallback)` registers SIGINT/SIGTERM handlers
- Cleanup includes stopping intervals, removing event listeners, and calling `device.close()`
- Prevents duplicate execution with `isExiting` flag
- Important for `--watch` mode to avoid stale event handlers

## Platform-Specific Notes

### Linux Requirements
- Node.js 20 or later
- udev rules for device access (see SETUP.md or run `install.sh`)
- User must be in `uucp` group for serial port access
- Firmware version 0.2.26 does not work on Linux; use 0.2.23

### Device Compatibility
Supports: Loupedeck Live, Live S, CT, Razer Stream Controller (X)

### Installation
Run `./install.sh` for automated setup (udev rules, permissions, dependencies)

## Creating New Components

To create a new component:

1. Create a class with `col`, `row` properties
2. Implement `draw(ctx, cellCoord)` method
3. Optionally implement `handleTouch(col, row)` for interactivity
4. Add vibration feedback via `this.vibration?.vibratePattern(pattern)`
5. Register with GridLayout using `addComponent()`

Example structure:
```javascript
export class MyComponent {
  constructor(col, row, options = {}) {
    this.col = col
    this.row = row
    this.vibration = options.vibration
    // ... other properties
  }

  draw(ctx, cellCoord) {
    const { x, y, width, height } = cellCoord
    // Drawing code using Canvas 2D API
  }

  async handleTouch(col, row) {
    if (col === this.col && row === this.row) {
      await this.vibration?.vibratePattern('tap')
      // Handle interaction
      return true
    }
    return false
  }
}
```

## Common Patterns

### Spawning Applications
Use Node's `exec` from `child_process` to launch applications:
```javascript
import { exec } from 'child_process'

exec('firefox', (error) => {
  if (error) {
    logger.error(`Failed to launch: ${error.message}`)
  }
})
```

### Auto-sizing Text
Use `autoSizeText()` from `src/utils/textUtils.js` to fit text within constraints:
```javascript
import { autoSizeText } from '../utils/textUtils.js'

autoSizeText(ctx, text, maxWidth, initialSize, minSize, fontStyle, fontFamily)
ctx.fillText(text, x, y)
```

### Managing Component State
Components can maintain internal state and update on each draw call or only when changed. Use `GridLayout.startAutoUpdate(interval)` for time-based updates (like clocks).

### Volume Control with Knobs
Listen to knob rotation events for volume control:
```javascript
loupedeckDevice.on('rotate', async ({ id, delta }) => {
  // Note: Knob IDs are strings, not numbers!
  // Using knobTL (top-left knob) for volume control
  if (id === 'knobTL') {
    const step = delta * 5  // 5% per rotation step
    await volumeControl.adjustVolume(step)

    // Show volume display temporarily (auto-hides after 2 seconds)
    volumeDisplay.showTemporarily()

    await layout.update()  // Refresh display
  }
})
```

**Important:** Knob IDs are device-specific strings:
- **Loupedeck Live S**: `'knobTL'` (top-left), `'knobCL'` (center-left)
- Current implementation uses `'knobTL'` for volume control
- VolumeDisplay is positioned at (col: 0, row: 0) - same position as Clock (overlaid)
- When visible, VolumeDisplay appears on top of Clock
- Use `node tests/test-knobs.js` to discover your device's knob IDs

**VolumeDisplay Temporary Display Pattern:**
- By default, VolumeDisplay is hidden (Clock is visible at col: 0, row: 0)
- When knobTL is rotated, `showTemporarily()` shows the display for 2 seconds, overlaying the Clock
- If knob is rotated again before timeout, the timer resets
- After 2 seconds of inactivity, VolumeDisplay hides and Clock becomes visible again
- Tapping position (0, 0) when VolumeDisplay is visible toggles mute and extends display time
- This mimics the official Loupedeck software behavior

**Component Overlay Pattern:**
To overlay components at the same position, add them in order (base component first, overlay component last):
```javascript
layout.addComponents([clock, firefoxButton, volumeDisplay])
// volumeDisplay added last, so it draws on top of clock when visible
```

VolumeDisplay component shows current volume with a progress bar, percentage, and speaker icon (🔇🔈🔉🔊 based on volume level). Tapping the display toggles mute.

### Audio System Support
- **PipeWire** (wpctl): Primary support, recommended for modern systems
- **PulseAudio** (pactl): Fallback support
- Auto-detection on initialization
- Volume range: 0-100%
- Commands: `wpctl set-volume @DEFAULT_AUDIO_SINK@ X.XX` or `pactl set-sink-volume @DEFAULT_SINK@ X%`
