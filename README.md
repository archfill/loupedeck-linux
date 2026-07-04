<p align="center">
  <img src="./docs/logo.svg" alt="Loupedeck Linux Logo" width="200" height="200">
</p>

# Loupedeck Linux

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![Package Manager](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-red)](https://pnpm.io)

[English](./README.md) | [日本語](./README.ja.md)

An open-source desktop controller application for Loupedeck devices on Linux with an intuitive configuration UI.

## 🌟 Features

- 🎮 **Supported Device**: Loupedeck Live S (other devices untested)
- 🖥️ **Touchscreen**: Custom button layout on 5×3 grid
- 💡 **LED Control**: Customize physical button colors
- 🎚️ **Knob Control**: Intuitive volume and media control
- 🚀 **Application Launcher**: Launch your favorite apps with one tap
- 🖥️ **Desktop UI**: Modern Tauri configuration interface (React + Vite + TailwindCSS v4)
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
│   ├── desktop/           # Tauri desktop shell
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

# Start the desktop app in the optional Nix dev shell
nix develop -c pnpm run dev
```

The settings UI runs in a Tauri desktop window. The app does not start the old
backend HTTP server on `127.0.0.1:9876`.

## 🔧 Detailed Setup

### Install System Packages

For Nix users, the optional dev shell is the recommended setup because Tauri
needs native Linux libraries such as WebKitGTK, DBus, and appindicator:

```bash
nix develop
```

For non-Nix environments, install Node.js, pnpm, Rust/Cargo, WebKitGTK 4.1,
DBus, GTK3, appindicator, and pkg-config with your system package manager.

```bash
# Arch Linux
sudo pacman -S nodejs pnpm rust webkit2gtk-4.1 dbus gtk3 libayatana-appindicator pkgconf libusb pamixer playerctl wtype

# Ubuntu/Debian
sudo apt install nodejs npm libwebkit2gtk-4.1-dev libdbus-1-dev libgtk-3-dev libayatana-appindicator3-dev pkg-config libusb-1.0-0-dev pamixer playerctl wtype
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

# Start the desktop app
nix develop -c pnpm run dev
```

## 💻 Development

```bash
# Tauri desktop app
nix develop -c pnpm run dev

# Web UI type check
pnpm --filter web exec tsc --noEmit
```

### Other Commands

```bash
pnpm run build      # Build desktop app
pnpm run web:build  # Build React UI only
pnpm run lint           # Run linter
pnpm run format         # Run formatter
```

## 🚀 Desktop Build

```bash
nix develop -c pnpm run build
```

The production desktop binary embeds the built React UI and does not require a
local Web UI port.

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

### Desktop UI

- Development: Tauri WebView backed by Vite
- Production: Tauri binary with embedded React assets
- Configuration transport: Tauri IPC, not a fixed localhost HTTP port

## ⚙️ Configuration

Runtime configuration is managed in `~/.config/loupedeck-linux/config.json`.
Changes are applied immediately via hot reload.

## Desktop IPC Commands

The settings UI talks to the Tauri shell through local IPC instead of a fixed
HTTP port.

| Command            | Description              |
| ------------------ | ------------------------ |
| `get_config`       | Full configuration       |
| `save_pages`       | Save page configuration  |
| `create_page`      | Create a new page        |
| `delete_page`      | Delete a page            |
| `update_page_meta` | Update page metadata     |

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

- [architecture.md](docs/architecture.md) - Architecture details
- [component-guide.md](docs/component-guide.md) - Component creation guide
- [api-reference.md](docs/api-reference.md) - Legacy HTTP API reference
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
nix develop -c pnpm run dev
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
- [Tauri](https://tauri.app/) - Desktop application framework (MIT/Apache-2.0)
- [React](https://react.dev/) - UI library (MIT)
- [Vite](https://vitejs.dev/) - Build tool (MIT)
- [TailwindCSS](https://tailwindcss.com/) - CSS framework (MIT)
