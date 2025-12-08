# API Reference

## Backend API Server

**Location**: `apps/backend/src/server/api.ts`
**Port**: 9876
**CORS**: Enabled for development

## Endpoints

### Health Check

```
GET /api/health
```

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Full Configuration

```
GET /api/config
```

Returns complete configuration including components, constants, and device info.

**Response**:
```json
{
  "components": { ... },
  "constants": { ... },
  "device": { ... }
}
```

### Components Configuration

```
GET /api/config/components
```

Returns component configuration only.

**Response**:
```json
{
  "pages": [
    {
      "id": "main",
      "name": "Main",
      "components": [
        {
          "type": "clock",
          "position": { "col": 0, "row": 0 }
        },
        {
          "type": "button",
          "position": { "col": 1, "row": 0 },
          "appName": "firefox",
          "command": "firefox"
        }
      ]
    }
  ]
}
```

### System Constants

```
GET /api/config/constants
```

**Response**:
```json
{
  "GRID_COLUMNS": 5,
  "GRID_ROWS": 3,
  "KEY_SIZE": 90,
  "VIBRATION_PATTERNS": {
    "TAP": "tap",
    "SUCCESS": "success",
    "ERROR": "error"
  },
  "BUTTON_LED_COLORS": { ... }
}
```

### Device Information

```
GET /api/device
```

**Response**:
```json
{
  "type": "Loupedeck Live S",
  "connected": true,
  "grid": {
    "columns": 5,
    "rows": 3
  },
  "buttons": 8,
  "knobs": 2
}
```

### Reload Configuration

```
POST /api/config/reload
```

Reloads configuration from `config/config.json` without restart.

**Response**:
```json
{
  "status": "ok",
  "message": "Configuration reloaded"
}
```

## Web UI API Usage

The web UI fetches configuration from the backend API:

```typescript
// apps/web/src/hooks/useConfig.ts
const response = await fetch('/api/config')
const config = await response.json()
```

Vite proxy configuration (`apps/web/vite.config.ts`):
```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:9876',
      changeOrigin: true,
    },
  },
}
```

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `CONFIG_NOT_FOUND` - Configuration file missing
- `DEVICE_NOT_CONNECTED` - No device connected
- `INVALID_REQUEST` - Malformed request
