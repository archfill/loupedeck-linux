# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js + TypeScript application for controlling Loupedeck devices (Live, Live S, CT) on Linux systems, built on top of the `foxxyz/loupedeck` library. It provides a component-based architecture for creating custom touchscreen interfaces with buttons, clocks, and other interactive elements, along with a React-based web UI for configuration viewing.

**Key Technologies:**
- **Backend**: TypeScript, Node.js, Canvas, Pino logger, Express API server
- **Frontend**: React, Vite, TypeScript, TailwindCSS v4
- **Monorepo**: npm workspaces with `web/` workspace for frontend

## Development Commands

### Running the Application

```bash
npm start              # Run backend with info-level logging
npm run start:debug    # Run backend with debug-level logging
npm run start:prod     # Run backend in production mode
npm run dev            # Run backend in watch mode with debug logging
npm run dev:info       # Run backend in watch mode with info logging

# Full-stack development
npm run dev:all        # Run both backend + web UI concurrently
npm run dev:web        # Run web UI only (Vite dev server)
npm run build:web      # Build web UI for production
npm run preview:web    # Preview production web UI build
```

### Code Quality

```bash
npm run lint           # Run ESLint to check for issues
npm run lint:fix       # Auto-fix ESLint issues
npm run format         # Format code with Prettier
npm run format:check   # Check code formatting
npx tsc --noEmit       # TypeScript type checking (no code generation)
```

### Testing

```bash
node tests/test.js          # Basic device event testing
node tests/test-grid.js     # Grid layout testing
node tests/clock.js         # Clock component testing
node tests/debug.js         # Debug mode testing
node tests/test-volume.js   # Volume control testing
node tests/test-knobs.js    # Knob ID discovery
```

## Architecture

### Monorepo Structure

This project uses **npm workspaces** to manage a monorepo:

```
loupedeck-linux/
├── main.ts                    # Backend entry point (TypeScript)
├── src/                       # Backend source code (TypeScript)
│   ├── components/           # UI components (Clock, Button, VolumeDisplay, MediaDisplay)
│   ├── config/               # Configuration files (components.ts, constants.ts)
│   ├── device/               # Device control (LoupedeckDevice.ts)
│   ├── handlers/             # Event handlers (VolumeHandler.ts, MediaHandler.ts)
│   ├── server/               # Express API server (api.ts)
│   ├── utils/                # Utilities (logger, appLauncher, volumeControl, etc.)
│   └── types/                # TypeScript type definitions (loupedeck.d.ts)
├── web/                       # Frontend workspace (React + Vite + TypeScript)
│   ├── src/
│   │   ├── App.tsx           # Main React component
│   │   ├── components/       # React components (LoupedeckPreview.tsx)
│   │   ├── index.css         # TailwindCSS v4 imports
│   │   └── lib/              # shadcn/ui utilities
│   ├── vite.config.ts
│   └── package.json
├── scripts/                   # Bash scripts (1password-setup.sh, etc.)
├── tests/                     # Test files
└── package.json              # Root workspace configuration
```

### Core Architecture Pattern

The application follows a **component-based architecture** with separation of concerns:

1. **Device Layer** (`src/device/`): Manages hardware connection and low-level device events
2. **Component Layer** (`src/components/`): Reusable UI components that render to canvas
3. **Handler Layer** (`src/handlers/`): Event handlers that coordinate between device events and components
4. **Configuration Layer** (`src/config/`): Type-safe configuration with TypeScript interfaces
5. **Utilities Layer** (`src/utils/`): Shared functionality (logging, text rendering, image loading, vibration)
6. **API Server** (`src/server/`): Express server exposing configuration and device info
7. **Web UI** (`web/`): React-based frontend for viewing configuration

### Key Classes and Their Relationships

**LoupedeckDevice** (`src/device/LoupedeckDevice.ts`)

- Wraps the `loupedeck` library's device discovery and connection
- Manages event handlers for device events (touch, buttons, disconnect)
- Coordinates vibration feedback through `VibrationUtil`
- Handles graceful shutdown and cleanup
- Provides methods: `setButtonColor()`, `setButtonColors()` for physical LED buttons
- Important: Converts raw touch coordinates to grid positions using `marginX` calculation at src/device/LoupedeckDevice.ts:120

**Screen** (`src/components/Screen.ts`)

- Base class for all screen layouts
- Manages grid calculations: `marginX`, `keySize`, columns/rows
- Provides `getCellCoordinates(col, row)` for positioning components
- Handles canvas drawing and updates via `device.drawScreen('center', callback)`

**GridLayout** (`src/components/GridLayout.ts`)

- Extends `Screen` to manage multiple components
- Maintains `componentMap` (Map with `${col}_${row}` keys) for touch event routing
- Handles component drawing and touch event delegation
- Provides `startAutoUpdate(interval)` for periodic redraws
- Components are drawn in order (last component appears on top for overlays)

**Component Pattern** (Button, Clock, VolumeDisplay, MediaDisplay)

- Each component has `col`, `row` properties for grid positioning
- Implements `draw(ctx, cellCoord)` to render itself
- Implements `handleTouch(col, row)` to respond to user interaction
- Components are stateful and can update their appearance
- VolumeDisplay and MediaDisplay can be shown/hidden temporarily (overlay pattern)

**Handler Pattern** (VolumeHandler, MediaHandler)

- Encapsulates event handling logic for specific features
- Coordinates between device events (knob rotation/click), control utilities, display components, and layout updates
- Example: `VolumeHandler` listens to knobTL events, calls `VolumeControl`, updates `VolumeDisplay`, and refreshes `GridLayout`
- Provides `handleRotate(id, delta)` and `handleDown(id)` methods

**VolumeControl** (`src/utils/volumeControl.ts`)

- System audio volume control wrapper
- Auto-detects PipeWire (wpctl) or PulseAudio (pactl)
- Provides methods: `setVolume()`, `adjustVolume()`, `increaseVolume()`, `decreaseVolume()`, `toggleMute()`
- Caches current volume state to minimize system calls

**MediaControl** (`src/utils/mediaControl.ts`)

- Media player control wrapper using `playerctl`
- Provides methods: `play()`, `pause()`, `playPause()`, `next()`, `previous()`
- Retrieves metadata: `getMetadata()` returns title, artist, album, status

**AppLauncher** (`src/utils/appLauncher.ts`)

- Launches applications via `exec()` from `child_process`
- Provides vibration feedback on success/error
- Used by Button components to launch applications

**IconResolver** (`src/utils/iconResolver.ts`)

- Resolves application names to icon file paths
- Searches system icon directories for PNG/SVG icons
- Caches resolved icon paths

### Type-Safe Configuration

Configuration is defined in `src/config/components.ts` with TypeScript interfaces:

```typescript
export interface ButtonConfig {
  position: Position            // { col: number, row: number }
  appName: string              // Used by IconResolver
  options: ButtonOptions       // Label, colors, icon size, vibration pattern
  command: string              // Shell command to execute
}
```

Key benefits:
- Type safety prevents configuration errors
- IntelliSense support in editors
- Enforced vibration pattern literals via `VibrationPattern` type
- Centralized constants in `src/config/constants.ts`

### Component Lifecycle

1. **Initialization**: Create components with position and configuration from `src/config/components.ts`
2. **Registration**: Add to GridLayout via `addComponent()` or `addComponents()`
3. **Rendering**: GridLayout calls `draw(ctx, cellCoord)` on each component
4. **Event Handling**: Touches are routed through GridLayout's `componentMap` to the appropriate component
5. **Updates**: Use `startAutoUpdate(interval)` for periodic redraws (needed for Clock, etc.)
6. **Cleanup**: Components with timeouts (VolumeDisplay, MediaDisplay) provide `cleanup()` methods

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

**Knob Events (via Handlers):**

```
User Rotates Knob → Loupedeck Hardware
    ↓
Device 'rotate' event ({ id, delta })
    ↓
VolumeHandler.handleRotate(id, delta) or MediaHandler.handleRotate(id, delta)
    ↓
VolumeControl.adjustVolume(delta * step) or MediaControl.next()/previous()
    ↓
Display.showTemporarily() (e.g., VolumeDisplay, MediaDisplay)
    ↓
GridLayout.update() (refresh display)
```

## Important Implementation Details

### TypeScript Usage

- All backend code is written in TypeScript (`.ts` files)
- Entry point is `main.ts` (not `main.js`)
- Run with `tsx` (TypeScript executor): `tsx main.ts` or `tsx watch main.ts`
- Type definitions for external libraries in `src/types/` (e.g., `loupedeck.d.ts`)
- Use `.ts` extensions in imports: `import { logger } from './src/utils/logger.ts'`

### Touch Coordinate Calculation

The device screen has horizontal margins. Touch coordinates must be adjusted:

```typescript
const marginX = (screenWidth - totalWidth) / 2
const col = Math.floor((x - marginX) / keySize)
const row = Math.floor(y / keySize)
```

This is handled in `LoupedeckDevice.onTouch()` at src/device/LoupedeckDevice.ts:120

### Canvas Drawing

All drawing happens through the device's `drawScreen()` method:

```typescript
await device.drawScreen('center', (ctx) => {
  // Canvas 2D drawing context operations
})
```

### Logging System

Uses `pino` logger with environment-based configuration:

- Development: Pretty-printed, colorized output
- Production: JSON format
- Control level via `LOG_LEVEL` environment variable (debug, info, warn, error)
- Access via `import { logger } from './src/utils/logger.ts'`

### Image Loading

Images are cached automatically by `imageLoader.ts`:

- Use `loadImageFile(path)` to load images (accepts relative or absolute paths)
- Use `drawImage(ctx, image, x, y, width, height, keepAspectRatio)` to render
- Images are resolved relative to project root
- IconResolver automatically finds system icons for applications

### Vibration Feedback

Predefined patterns in `src/config/constants.ts`:

```typescript
export const VIBRATION_PATTERNS = {
  TAP: 'tap',           // Short button press (30ms)
  SUCCESS: 'success',   // Confirmation pattern (50, 80, 50ms)
  ERROR: 'error',       // Long error buzz (200ms)
  WARNING: 'warning',   // Warning pattern
  CONNECT: 'connect',   // Device connection pattern
} as const
```

Add to components via `vibration` and `vibrationPattern` options.

### Exit Handling

The application implements graceful shutdown:

- `LoupedeckDevice.setupExitHandlers(cleanupCallback)` registers SIGINT/SIGTERM handlers
- Cleanup includes stopping intervals, removing event listeners, calling component `cleanup()` methods, stopping API server, and calling `device.close()`
- Prevents duplicate execution with `isExiting` flag
- Important for `tsx watch` mode to avoid stale event handlers
- See main.ts:234 for cleanup implementation

### API Server

Express server on port 3000 provides REST endpoints:

- `GET /api/health` - Health check
- `GET /api/config` - Full configuration (components, constants, device info)
- `GET /api/config/components` - Component configuration only
- `GET /api/config/constants` - System constants only
- `GET /api/device` - Device information only

CORS is enabled for development. Used by the React web UI to display configuration.

## Platform-Specific Notes

### Linux Requirements

- Node.js 20 or later
- udev rules for device access (see README.md)
- Optional: pamixer/wpctl (volume), playerctl (media), wtype (keyboard simulation)

### Device Compatibility

Supports: Loupedeck Live, Live S, CT, Razer Stream Controller (X)

## Creating New Components

To create a new component:

1. Create a TypeScript class in `src/components/` with `col`, `row` properties
2. Implement `draw(ctx, cellCoord)` method
3. Optionally implement `handleTouch(col, row)` for interactivity
4. Add vibration feedback via `this.vibration?.vibratePattern(pattern)`
5. Define configuration interface and export config from `src/config/components.ts`
6. Register with GridLayout using `addComponent()` in main.ts

Example structure:

```typescript
import type { VibrationUtil } from '../utils/vibration.ts'
import type { CellCoord } from './Screen.ts'

export class MyComponent {
  col: number
  row: number
  private vibration: VibrationUtil | null

  constructor(col: number, row: number, options: any = {}) {
    this.col = col
    this.row = row
    this.vibration = options.vibration || null
  }

  draw(ctx: any, cellCoord: CellCoord): void {
    const { x, y, width, height } = cellCoord
    // Drawing code using Canvas 2D API
  }

  async handleTouch(col: number, row: number): Promise<boolean> {
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

Use `AppLauncher` utility for consistent application launching with feedback:

```typescript
import { AppLauncher } from './src/utils/appLauncher.ts'

const appLauncher = new AppLauncher(vibration)
await appLauncher.launch('firefox')  // Provides success/error vibration feedback
```

Or use Node's `exec` directly:

```typescript
import { exec } from 'child_process'

exec('firefox', (error) => {
  if (error) {
    logger.error(`Failed to launch: ${error.message}`)
  }
})
```

### Auto-sizing Text

Use `autoSizeText()` from `src/utils/textUtils.ts` to fit text within constraints:

```typescript
import { autoSizeText } from '../utils/textUtils.ts'

autoSizeText(ctx, text, maxWidth, initialSize, minSize, fontStyle, fontFamily)
ctx.fillText(text, x, y)
```

### Managing Component State

Components can maintain internal state and update on each draw call or only when changed. Use `GridLayout.startAutoUpdate(interval)` for time-based updates (like clocks).

### Handler Pattern for Device Events

When adding new device event functionality:

1. Create a handler class in `src/handlers/` (e.g., `MyFeatureHandler.ts`)
2. Implement `handleRotate(id, delta)` and/or `handleDown(id)` methods
3. Coordinate between control utilities, display components, and layout updates
4. Register handler in main.ts with `loupedeckDevice.on('rotate', ...)` and `loupedeckDevice.on('down', ...)`

Example:

```typescript
export class MyFeatureHandler {
  constructor(private control: any, private display: any, private layout: any, private vibration: any) {}

  async handleRotate(id: string, delta: number): Promise<void> {
    if (id === KNOB_IDS.CENTER_LEFT) {
      await this.control.doSomething(delta)
      this.display.showTemporarily()
      await this.vibration?.vibratePattern('tap')
      await this.layout.update()
    }
  }
}
```

### Volume Control with Knobs

Listen to knob rotation events for volume control and click events for mute toggle:

```typescript
// Knob rotation: adjust volume
loupedeckDevice.on('rotate', async ({ id, delta }) => {
  // Note: Knob IDs are strings, not numbers!
  if (id === 'knobTL') {
    const step = delta * 5 // 5% per rotation step
    await volumeControl.adjustVolume(step)
    volumeDisplay.showTemporarily()
    await layout.update()
  }
})

// Knob click: toggle mute
loupedeckDevice.on('down', async ({ id }) => {
  if (id === 'knobTL') {
    const isMuted = await volumeControl.toggleMute()
    volumeDisplay.showTemporarily()
    await layout.update()
  }
})
```

**Important:** Knob IDs are device-specific strings:

- **Loupedeck Live S**: `'knobTL'` (top-left), `'knobCL'` (center-left)
- Current implementation uses `'knobTL'` for volume control, `'knobCL'` for media control
- Use `node tests/test-knobs.js` to discover your device's knob IDs

### Temporary Display (Overlay) Pattern

Components like VolumeDisplay and MediaDisplay use a temporary overlay pattern:

- By default, VolumeDisplay is hidden (Clock is visible at col: 0, row: 0)
- When knobTL is rotated, `showTemporarily()` shows the display for 2 seconds, overlaying the Clock
- If knob is used again before timeout, the timer resets
- After timeout, VolumeDisplay hides and Clock becomes visible again
- Tapping the display position when visible can trigger additional actions (e.g., toggle mute)

**Component Overlay Pattern:**
To overlay components at the same position, add them in order (base component first, overlay component last):

```typescript
layout.addComponents([clock, firefoxButton, volumeDisplay, mediaDisplay])
// volumeDisplay and mediaDisplay added last, so they draw on top when visible
```

VolumeDisplay shows current volume with a progress bar, percentage, and speaker icon (🔇🔈🔉🔊 based on volume level).

MediaDisplay shows current track with title, artist, and playback status.

### Audio System Support

- **PipeWire** (wpctl): Primary support, recommended for modern systems
- **PulseAudio** (pactl): Fallback support
- Auto-detection on initialization via `VolumeControl.detectBackend()`
- Volume range: 0-100%
- Commands: `wpctl set-volume @DEFAULT_AUDIO_SINK@ X.XX` or `pactl set-sink-volume @DEFAULT_SINK@ X%`

### Media Control

- Uses `playerctl` for MPRIS media player control
- Supports most Linux media players (Spotify, VLC, Firefox, Chrome, etc.)
- Commands: `playerctl play-pause`, `playerctl next`, `playerctl previous`
- Metadata: `playerctl metadata` for title, artist, album, status

### Physical Button LED Control

Physical buttons (not touchscreen) can have their LED colors set:

```typescript
// Set individual button
await loupedeckDevice.setButtonColor(0, '#FF0000')  // Button 0 to red

// Set multiple buttons
await loupedeckDevice.setButtonColors({
  0: '#FFFFFF',  // Button 0: white
  1: '#FF0000',  // Button 1: red
  2: '#00FF00',  // Button 2: green
  3: '#0000FF',  // Button 3: blue
})
```

See `src/config/constants.ts` for default LED color configuration.

## Web UI Development

The web UI is a separate workspace in `web/`:

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS v4
- **Components**: shadcn/ui components
- **API**: Fetches configuration from backend API (http://localhost:3000/api/config)

To develop the web UI:

```bash
npm run dev:all        # Run both backend and web UI
# OR
npm run dev:web        # Run web UI only (requires backend to be running separately)
```

Web UI displays:
- Device information (type, grid size, button/knob counts)
- Component layout with visual preview
- System constants and configuration

To add new configuration to the web UI:
1. Ensure backend API exposes the data in `src/server/api.ts`
2. Update React components in `web/src/` to fetch and display the data
3. Build for production: `npm run build:web`
