# Architecture

## Overview

This application controls Loupedeck devices on Linux using a component-based architecture with clear separation of concerns.

## Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Web UI (React)                     │
│                    apps/web/src/                        │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP API
┌─────────────────────────▼───────────────────────────────┐
│                    API Server                           │
│              apps/backend/src/server/                   │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    Handlers                             │
│    VolumeHandler, MediaHandler, PageHandler, etc.       │
│              apps/backend/src/handlers/                 │
└───────────┬─────────────┴─────────────┬─────────────────┘
            │                           │
┌───────────▼───────────┐   ┌───────────▼───────────┐
│      Components       │   │       Utilities       │
│  Button, Clock, etc.  │   │ VolumeControl, etc.   │
│ apps/backend/src/     │   │ apps/backend/src/     │
│      components/      │   │       utils/          │
└───────────┬───────────┘   └───────────────────────┘
            │
┌───────────▼───────────────────────────────────────────┐
│                    GridLayout                          │
│          Component management, touch routing           │
│        apps/backend/src/components/GridLayout.ts       │
└───────────────────────┬───────────────────────────────┘
                        │
┌───────────────────────▼───────────────────────────────┐
│                  LoupedeckDevice                       │
│     Hardware abstraction, event handling, drawing      │
│       apps/backend/src/device/LoupedeckDevice.ts       │
└───────────────────────┬───────────────────────────────┘
                        │
┌───────────────────────▼───────────────────────────────┐
│              foxxyz/loupedeck library                  │
│                  USB communication                     │
└───────────────────────────────────────────────────────┘
```

## Key Classes

### LoupedeckDevice

**Location**: `apps/backend/src/device/LoupedeckDevice.ts`

Wraps the `loupedeck` library and provides:
- Device discovery and connection
- Event handling (touch, buttons, knobs, disconnect)
- Vibration feedback coordination
- Graceful shutdown
- LED button color control

**Key methods**:
- `setButtonColor(buttonId, color)` - Set single LED
- `setButtonColors(colorMap)` - Set multiple LEDs
- `setupExitHandlers(callback)` - Register cleanup handlers

**Touch coordinate conversion** (line ~120):
```
marginX = (screenWidth - totalWidth) / 2
col = floor((x - marginX) / keySize)
row = floor(y / keySize)
```

### Screen

**Location**: `apps/backend/src/components/Screen.ts`

Base class for screen layouts:
- Grid calculations (`marginX`, `keySize`, columns/rows)
- `getCellCoordinates(col, row)` for component positioning
- Canvas drawing via `device.drawScreen('center', callback)`

### GridLayout

**Location**: `apps/backend/src/components/GridLayout.ts`

Extends `Screen` to manage multiple components:
- `componentMap` (Map with `${col}_${row}` keys) for touch routing
- Component drawing and event delegation
- `startAutoUpdate(interval)` for periodic redraws
- Components drawn in order (last = on top for overlays)

### Handlers

**Location**: `apps/backend/src/handlers/`

Coordinate between device events and system utilities:

| Handler | Knob | Function |
|---------|------|----------|
| VolumeHandler | knobTL | Volume control, mute toggle |
| MediaHandler | knobCL | Next/previous track |
| PageHandler | knobBL | Page navigation |
| WorkspaceHandler | - | Hyprland workspace switching |

## Event Flow

### Touch Events

```
User Touch → Loupedeck Hardware
    ↓
Device 'touchstart' event (raw x, y)
    ↓
LoupedeckDevice.onTouch() → converts to (col, row)
    ↓
GridLayout.handleTouch(col, row) → looks up componentMap
    ↓
Component.handleTouch() → executes action, vibration
```

### Knob Events

```
User Rotates Knob → Loupedeck Hardware
    ↓
Device 'rotate' event ({ id, delta })
    ↓
Handler.handleRotate(id, delta)
    ↓
Control utility (VolumeControl, MediaControl)
    ↓
Display.showTemporarily()
    ↓
GridLayout.update()
```

## Configuration System

### Runtime Config

**Location**: `apps/backend/config/config.json`

JSON configuration loaded at runtime, defines:
- Pages and their components
- Button configurations (position, command, icon)
- Clock settings
- Workspace buttons

### Type Definitions

**Location**: `apps/backend/src/config/`

- `constants.ts` - System constants, vibration patterns, LED colors
- `configLoader.ts` - Zod schemas, config loading/validation

## Component Lifecycle

1. **Initialization** - Create with position and config
2. **Registration** - Add to GridLayout via `addComponent()`
3. **Rendering** - GridLayout calls `draw(ctx, cellCoord)`
4. **Event Handling** - Touches routed through `componentMap`
5. **Updates** - `startAutoUpdate(interval)` for time-based updates
6. **Cleanup** - Components with timeouts provide `cleanup()` methods
