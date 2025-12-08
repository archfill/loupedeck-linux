# Common Patterns

## Handler Pattern

Handlers coordinate between device events and system utilities.

### Creating a Handler

**Location**: `apps/backend/src/handlers/`

```typescript
import { KNOB_IDS, VIBRATION_PATTERNS } from '../config/constants.ts'
import type { VibrationUtil } from '../utils/vibration.ts'
import type { GridLayout } from '../components/GridLayout.ts'

export class MyFeatureHandler {
  constructor(
    private control: MyControl,
    private display: MyDisplay,
    private layout: GridLayout,
    private vibration: VibrationUtil | null
  ) {}

  async handleRotate(id: string, delta: number): Promise<void> {
    if (id !== KNOB_IDS.TOP_LEFT) return

    await this.control.adjust(delta)
    this.display.showTemporarily()
    await this.vibration?.vibratePattern(VIBRATION_PATTERNS.TAP)
    await this.layout.update()
  }

  async handleDown(id: string): Promise<void> {
    if (id !== KNOB_IDS.TOP_LEFT) return

    await this.control.toggle()
    this.display.showTemporarily()
    await this.layout.update()
  }
}
```

### Registering a Handler

In `apps/backend/main.ts`:

```typescript
const myHandler = new MyFeatureHandler(control, display, layout, vibration)

loupedeckDevice.on('rotate', async ({ id, delta }) => {
  await myHandler.handleRotate(id, delta)
})

loupedeckDevice.on('down', async ({ id }) => {
  await myHandler.handleDown(id)
})
```

## Volume Control

### Basic Usage

```typescript
import { VolumeControl } from './src/utils/volumeControl.ts'

const volumeControl = new VolumeControl()

// Get current volume (0-100)
const volume = await volumeControl.getVolume()

// Set absolute volume
await volumeControl.setVolume(50)

// Adjust relative
await volumeControl.adjustVolume(5)   // +5%
await volumeControl.adjustVolume(-5)  // -5%

// Mute toggle
const isMuted = await volumeControl.toggleMute()
```

### With Knob Events

```typescript
loupedeckDevice.on('rotate', async ({ id, delta }) => {
  if (id === 'knobTL') {
    const step = delta * 5  // 5% per step
    await volumeControl.adjustVolume(step)
    volumeDisplay.showTemporarily()
    await layout.update()
  }
})

loupedeckDevice.on('down', async ({ id }) => {
  if (id === 'knobTL') {
    await volumeControl.toggleMute()
    volumeDisplay.showTemporarily()
    await layout.update()
  }
})
```

### Backend Detection

VolumeControl auto-detects PipeWire or PulseAudio:

```typescript
// Uses wpctl for PipeWire
wpctl set-volume @DEFAULT_AUDIO_SINK@ 0.50

// Falls back to pactl for PulseAudio
pactl set-sink-volume @DEFAULT_SINK@ 50%
```

## Media Control

### Basic Usage

```typescript
import { MediaControl } from './src/utils/mediaControl.ts'

const mediaControl = new MediaControl()

// Playback control
await mediaControl.playPause()
await mediaControl.next()
await mediaControl.previous()

// Get current track info
const metadata = await mediaControl.getMetadata()
// { title: "Song Name", artist: "Artist", album: "Album", status: "Playing" }
```

### With Knob Events

```typescript
loupedeckDevice.on('rotate', async ({ id, delta }) => {
  if (id === 'knobCL') {
    if (delta > 0) {
      await mediaControl.next()
    } else {
      await mediaControl.previous()
    }
    mediaDisplay.showTemporarily()
    await layout.update()
  }
})

loupedeckDevice.on('down', async ({ id }) => {
  if (id === 'knobCL') {
    await mediaControl.playPause()
    mediaDisplay.showTemporarily()
    await layout.update()
  }
})
```

## Application Launching

### Using AppLauncher

```typescript
import { AppLauncher } from './src/utils/appLauncher.ts'

const appLauncher = new AppLauncher(vibration)

// Launch with feedback
await appLauncher.launch('firefox')
// Success: vibrates 'success' pattern
// Error: vibrates 'error' pattern
```

### Direct Execution

```typescript
import { exec } from 'child_process'
import { logger } from './src/utils/logger.ts'

exec('firefox', (error) => {
  if (error) {
    logger.error(`Failed to launch: ${error.message}`)
  }
})
```

## Physical Button LEDs

### Set Individual Button

```typescript
await loupedeckDevice.setButtonColor(0, '#FF0000')  // Red
await loupedeckDevice.setButtonColor(1, '#00FF00')  // Green
```

### Set Multiple Buttons

```typescript
await loupedeckDevice.setButtonColors({
  0: '#FFFFFF',  // White
  1: '#FF0000',  // Red
  2: '#00FF00',  // Green
  3: '#0000FF',  // Blue
})
```

### Default Colors

Defined in `apps/backend/src/config/constants.ts`:

```typescript
export const BUTTON_LED_COLORS = {
  0: '#FFFFFF',
  1: '#FF5500',
  2: '#00FF00',
  // ...
}
```

## Knob IDs

Knob IDs are device-specific strings:

| Device | Top-Left | Center-Left | Bottom-Left |
|--------|----------|-------------|-------------|
| Live S | `knobTL` | `knobCL` | `knobBL` |

Discover your device's knob IDs:

```bash
node apps/backend/tests/test-knobs.js
```

## Graceful Shutdown

### Setup Exit Handlers

```typescript
loupedeckDevice.setupExitHandlers(async () => {
  // Stop intervals
  layout.stopAutoUpdate()

  // Cleanup components
  volumeDisplay.cleanup()
  mediaDisplay.cleanup()

  // Stop API server
  await apiServer.stop()

  logger.info('Cleanup complete')
})
```

### Component Cleanup

```typescript
class MyComponent {
  private interval: NodeJS.Timeout | null = null

  startUpdates(): void {
    this.interval = setInterval(() => this.update(), 1000)
  }

  cleanup(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }
}
```

## Hot Reload Configuration

Configuration changes in `apps/backend/config/config.json` are watched:

```typescript
import { watchConfig } from './src/config/configLoader.ts'

watchConfig((newConfig) => {
  // Rebuild components with new config
  rebuildComponents(newConfig)
  layout.update()
})
```

Stop watching on shutdown:

```typescript
import { stopWatchingConfig } from './src/config/configLoader.ts'

loupedeckDevice.setupExitHandlers(() => {
  stopWatchingConfig()
})
```
