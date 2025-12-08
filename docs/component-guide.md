# Component Guide

## Creating a New Component

### Step 1: Create the Component Class

Create a new file in `apps/backend/src/components/`:

```typescript
import type { VibrationUtil } from '../utils/vibration.ts'
import type { CellCoord } from './Screen.ts'

export interface MyComponentOptions {
  vibration?: VibrationUtil | null
  // Add custom options here
}

export class MyComponent {
  col: number
  row: number
  private vibration: VibrationUtil | null

  constructor(col: number, row: number, options: MyComponentOptions = {}) {
    this.col = col
    this.row = row
    this.vibration = options.vibration || null
  }

  draw(ctx: CanvasRenderingContext2D, cellCoord: CellCoord): void {
    const { x, y, width, height } = cellCoord

    // Draw background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(x, y, width, height)

    // Draw content
    ctx.fillStyle = '#ffffff'
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Hello', x + width / 2, y + height / 2)
  }

  async handleTouch(col: number, row: number): Promise<boolean> {
    if (col === this.col && row === this.row) {
      await this.vibration?.vibratePattern('tap')
      // Handle interaction
      return true // Consumed the touch
    }
    return false // Did not handle
  }
}
```

### Step 2: Define Configuration (Optional)

If the component needs configuration, add to `apps/backend/src/config/configLoader.ts`:

```typescript
export interface MyComponentConfig {
  position: Position
  options: {
    label?: string
    color?: string
  }
}
```

### Step 3: Register with GridLayout

In `apps/backend/main.ts`:

```typescript
import { MyComponent } from './src/components/MyComponent.ts'

const myComponent = new MyComponent(1, 2, {
  vibration: loupedeckDevice.vibration,
})

layout.addComponent(myComponent)
```

## Component Interface

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `col` | number | Grid column position |
| `row` | number | Grid row position |

### Required Methods

#### `draw(ctx, cellCoord)`

Renders the component to canvas.

**Parameters**:
- `ctx`: CanvasRenderingContext2D
- `cellCoord`: `{ x, y, width, height }` - Pixel coordinates

#### `handleTouch(col, row)` (Optional)

Handles touch events.

**Parameters**:
- `col`: Touched grid column
- `row`: Touched grid row

**Returns**: `Promise<boolean>` - true if touch was handled

### Optional Methods

#### `cleanup()`

Called on shutdown for components with timeouts/intervals.

```typescript
cleanup(): void {
  if (this.timeout) {
    clearTimeout(this.timeout)
  }
}
```

## Existing Components

### Button

**Location**: `apps/backend/src/components/Button.ts`

App launcher button with icon and label.

**Options**:
- `label` - Text label
- `iconSize` - Icon dimensions
- `backgroundColor` - Background color
- `command` - Shell command to execute
- `vibration` - VibrationUtil instance
- `vibrationPattern` - Pattern name ('tap', 'success', 'error')

### Clock

**Location**: `apps/backend/src/components/Clock.ts`

Digital clock display with time and date.

**Options**:
- `backgroundColor` - Background color
- `textColor` - Text color
- `showSeconds` - Show seconds
- `dateFormat` - Date format string

### VolumeDisplay

**Location**: `apps/backend/src/components/VolumeDisplay.ts`

Volume indicator with progress bar (overlay component).

**Features**:
- Shows/hides temporarily via `showTemporarily()`
- Progress bar visualization
- Speaker icon based on volume level
- Mute indicator

### MediaDisplay

**Location**: `apps/backend/src/components/MediaDisplay.ts`

Media player info display (overlay component).

**Features**:
- Track title and artist
- Playback status
- Auto-hides after timeout

### WorkspaceButton

**Location**: `apps/backend/src/components/WorkspaceButton.ts`

Hyprland workspace switcher button.

## Drawing Utilities

### Text Utilities

**Location**: `apps/backend/src/utils/textUtils.ts`

```typescript
import { autoSizeText } from '../utils/textUtils.ts'

// Auto-fit text to width
autoSizeText(ctx, text, maxWidth, initialSize, minSize, fontStyle, fontFamily)
ctx.fillText(text, x, y)
```

### Image Loading

**Location**: `apps/backend/src/utils/imageLoader.ts`

```typescript
import { loadImageFile, drawImage } from '../utils/imageLoader.ts'

const image = await loadImageFile('assets/icon.png')
drawImage(ctx, image, x, y, width, height, keepAspectRatio)
```

### Icon Resolution

**Location**: `apps/backend/src/utils/iconResolver.ts`

```typescript
import { IconResolver } from '../utils/iconResolver.ts'

const resolver = new IconResolver()
const iconPath = await resolver.resolve('firefox')
// Returns: /usr/share/icons/.../firefox.png
```

## Vibration Patterns

Available patterns in `apps/backend/src/config/constants.ts`:

| Pattern | Description | Duration |
|---------|-------------|----------|
| `tap` | Short button press | 30ms |
| `success` | Confirmation | 50, 80, 50ms |
| `error` | Error feedback | 200ms |
| `warning` | Warning | Variable |
| `connect` | Device connected | Variable |

Usage:
```typescript
await this.vibration?.vibratePattern('tap')
```

## Overlay Pattern

For components that appear temporarily over others:

1. Add a `visible` property:
```typescript
private visible = false
```

2. Implement `showTemporarily()`:
```typescript
private timeout: NodeJS.Timeout | null = null

showTemporarily(duration = 2000): void {
  this.visible = true
  if (this.timeout) clearTimeout(this.timeout)
  this.timeout = setTimeout(() => {
    this.visible = false
  }, duration)
}
```

3. Check visibility in `draw()`:
```typescript
draw(ctx, cellCoord): void {
  if (!this.visible) return
  // Draw content
}
```

4. Register after base components:
```typescript
// Clock renders first, VolumeDisplay overlays when visible
layout.addComponents([clock, volumeDisplay])
```
