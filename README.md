# Loupedeck Linux

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![Package Manager](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-red)](https://pnpm.io)

[English](./README.md) | [日本語](./README.ja.md)

An open-source device controller application for Loupedeck devices on Linux with an intuitive Web UI for configuration.

## 🌟 Features

- 🎮 **Supported Device**: Loupedeck Live S (other devices untested)
- 🖥️ **Touchscreen**: Custom button layout on 5×3 grid
- 💡 **LED Control**: Customize physical button colors
- 🎚️ **Knob Control**: Intuitive volume and media control
- 🚀 **Application Launcher**: Launch your favorite apps with one tap
- 🌐 **Web UI**: Modern configuration interface (React + Vite + TailwindCSS v4)
- ⚡ **Hot Reload**: Instantly apply configuration changes

## 📁 Project Structure

Monorepo using pnpm workspaces:

```
loupedeck-linux/
├── apps/
│   ├── backend/           # Backend (@loupedeck-linux/backend)
│   │   ├── main.ts       # Entry point
│   │   ├── src/          # Source code
│   │   └── config/       # Runtime configuration
│   └── web/              # Frontend (React + Vite)
├── docs/                  # Detailed documentation
├── scripts/               # Management scripts
├── package.json          # Root configuration
└── pnpm-workspace.yaml   # Workspace definition
```

## 📋 Requirements

### System Requirements

- Linux (tested on Arch Linux)
- Node.js 20+
- pnpm 9+
- Loupedeck Live S (other devices untested)

### System Packages

```bash
# Arch Linux
sudo pacman -S nodejs pnpm libusb

# Ubuntu/Debian
sudo apt install nodejs npm libusb-1.0-0-dev
npm install -g pnpm
```

### udev Rules

Set up permissions for Loupedeck device:

```bash
sudo tee /etc/udev/rules.d/50-loupedeck.rules > /dev/null <<EOF
SUBSYSTEM=="usb", ATTR{idVendor}=="2ec2", ATTR{idProduct}=="0004", MODE="0666"
EOF

sudo udevadm control --reload-rules
sudo udevadm trigger
```

### Optional Dependencies

```bash
# Arch Linux
sudo pacman -S pamixer playerctl wtype

# Ubuntu/Debian
sudo apt install pamixer playerctl wtype
```

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/archfill/loupedeck-linux.git
cd loupedeck-linux

# Install dependencies
pnpm install

# Start backend + Web UI
pnpm run dev:all
```

Open http://localhost:5173 in your browser to access the Web UI.

## 🔧 Detailed Setup

### Install System Packages

```bash
# Arch Linux
sudo pacman -S nodejs pnpm libusb pamixer playerctl wtype

# Ubuntu/Debian
sudo apt install nodejs npm libusb-1.0-0-dev pamixer playerctl wtype
npm install -g pnpm
```

### Configure udev Rules

Set up permissions for Loupedeck device:

```bash
sudo tee /etc/udev/rules.d/50-loupedeck.rules > /dev/null <<EOF
SUBSYSTEM=="usb", ATTR{idVendor}=="2ec2", ATTR{idProduct}=="0004", MODE="0666"
EOF

sudo udevadm control --reload-rules
sudo udevadm trigger
```

### Install Application

```bash
# Clone repository
git clone https://github.com/archfill/loupedeck-linux.git
cd loupedeck-linux

# Install dependencies
pnpm install

# Make scripts executable
chmod +x scripts/*.sh
```

## 💻 Development

```bash
# Start backend only
pnpm run dev

# Start Web UI only
pnpm run dev:web

# Start both
pnpm run dev:all
```

### Other Commands

```bash
pnpm start              # Start in production mode
pnpm run build:web      # Build Web UI
pnpm run lint           # Run linter
pnpm run format         # Run formatter
```

## 🚀 Production Auto-start

### Install systemd Service

```bash
pnpm run service:install
```

### Manage Service

```bash
pnpm run service:status    # Check status
pnpm run service:stop      # Stop service
pnpm run service:restart   # Restart service
pnpm run service:logs      # View logs
pnpm run service:uninstall # Remove service
```

## 📖 Usage

### Device Layout

#### Touchscreen Grid (5 columns × 3 rows)

```
Col:    0           1           2           3           4
Row0: [Clock]    [Firefox]  [1Password] [Thunderbird] [ ]
Row1: [Setup]    [ ]        [Unlock]    [ ]           [ ]
Row2: [ ]        [ ]        [ ]         [ ]           [ ]
```

#### Knobs

| Knob            | Rotate              | Click       |
| --------------- | ------------------- | ----------- |
| knobTL (top)    | Volume adjustment   | Mute toggle |
| knobCL (center) | Previous/Next track | Play/Pause  |

### Web UI

- Development: http://localhost:5173
- API: http://localhost:9876/api/config

## ⚙️ Configuration

Runtime configuration is managed in `apps/backend/config/config.json`.
Changes are applied immediately via hot reload.

## API Endpoints

| Endpoint                     | Description        |
| ---------------------------- | ------------------ |
| `GET /api/health`            | Health check       |
| `GET /api/config`            | Full configuration |
| `GET /api/config/components` | Component config   |
| `GET /api/config/constants`  | System constants   |
| `GET /api/device`            | Device information |

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

- [architecture.md](docs/architecture.md) - Architecture details
- [component-guide.md](docs/component-guide.md) - Component creation guide
- [api-reference.md](docs/api-reference.md) - API reference
- [patterns.md](docs/patterns.md) - Common patterns
- [setup.md](docs/setup.md) - Detailed device setup

## 🔍 Troubleshooting

### Device Not Recognized

1. Check if udev rules are applied
2. Ensure official Loupedeck software is not running
3. Reconnect the device

```bash
# Check device
lsusb | grep Loupedeck

# Check permissions
sudo chmod 666 /dev/bus/usb/xxx/yyy
```

### Application Won't Start

```bash
# Force kill process
pnpm run kill

# Reconnect device and restart
pnpm run dev:all
```

### Other Issues

Search [GitHub Issues](https://github.com/archfill/loupedeck-linux/issues) or create a new issue.

## 🤝 Contributing

Bug reports, feature requests, and pull requests are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details.

## ⭐ Star Us

If you find this project helpful, please give it a star on GitHub!

## 🙏 Acknowledgments

This project uses the following amazing libraries:

- [foxxyz/loupedeck](https://github.com/foxxyz/loupedeck) - Loupedeck device control library (MIT)
- [node-canvas](https://github.com/Automattic/node-canvas) - Canvas API for Node.js (MIT)
- [Express](https://expressjs.com/) - Web server framework (MIT)
- [React](https://react.dev/) - UI library (MIT)
- [Vite](https://vitejs.dev/) - Build tool (MIT)
- [TailwindCSS](https://tailwindcss.com/) - CSS framework (MIT)
