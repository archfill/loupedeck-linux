# CLAUDE.md

## Project Overview

Loupedeck device controller for Linux. Backend controls hardware via `foxxyz/loupedeck`, web UI displays configuration.

**Stack**: TypeScript, Node.js, Canvas, Express, React, Vite, TailwindCSS v4, pnpm workspaces

## Structure

```
apps/
├── backend/          # Device control, API server (@loupedeck-linux/backend)
│   ├── main.ts       # Entry point
│   ├── src/
│   │   ├── components/   # UI components (Button, Clock, VolumeDisplay, etc.)
│   │   ├── device/       # Hardware abstraction (LoupedeckDevice.ts)
│   │   ├── handlers/     # Event handlers (VolumeHandler, MediaHandler)
│   │   ├── config/       # Constants and configuration loader
│   │   ├── server/       # Express API server
│   │   └── utils/        # Utilities (logger, volumeControl, mediaControl)
│   └── config/config.json  # Runtime configuration
└── web/              # React configuration viewer
```

## Commands

```bash
pnpm run dev          # Backend dev mode (watch + debug logging)
pnpm run dev:web      # Web UI dev mode (Vite)
pnpm run dev:all      # Both concurrently
pnpm run lint         # Lint all workspaces
pnpm run format       # Format with Prettier
```

## Architecture

Component-based pattern: Device → Handlers → Components → GridLayout → Canvas

- **LoupedeckDevice**: Hardware connection, event routing, vibration feedback
- **GridLayout**: Manages component grid, touch event delegation
- **Handlers**: Coordinate device events with control utilities (VolumeHandler, MediaHandler)
- **Components**: Render to canvas, handle touches (Button, Clock, VolumeDisplay)

## Key Implementation Notes

- Use `.ts` extensions in imports: `import { logger } from './src/utils/logger.ts'`
- Knob IDs are strings: `'knobTL'` (volume), `'knobCL'` (media)
- `LOG_LEVEL` env controls logging: debug, info, warn, error
- Touch coordinates adjusted by `marginX` in LoupedeckDevice.onTouch()
- API server runs on port 9876, web UI on 5173

## External Dependencies

- `wpctl` or `pactl` for volume control (auto-detected)
- `playerctl` for media control
- udev rules required for device access (see README.md)

## Documentation

Detailed docs in `docs/`:

- `architecture.md` - Layer structure, class relationships, event flow
- `component-guide.md` - Creating new components, existing components
- `api-reference.md` - REST API endpoints
- `patterns.md` - Handlers, volume/media control, LED control
- `setup.md` - Device setup for Linux
