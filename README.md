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
│   └── desktop/           # Tauri desktop application
│       ├── frontend/      # React + Vite UI
│       ├── sidecar/       # Node Loupedeck runtime
│       └── src-tauri/     # Rust/Tauri shell
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
- Rust/Cargo for Tauri development
- Loupedeck Live S (other devices untested)

### System Packages

```bash
# Arch Linux
sudo pacman -S nodejs pnpm rust webkit2gtk-4.1 dbus gtk3 libayatana-appindicator pkgconf libusb

# Ubuntu/Debian
sudo apt install nodejs npm libwebkit2gtk-4.1-dev libdbus-1-dev libgtk-3-dev libayatana-appindicator3-dev pkg-config libusb-1.0-0-dev
npm install -g pnpm
```

### udev Rules

Set up permissions for the Loupedeck device:

```bash
pnpm run device:setup:udev
pnpm run device:doctor
```

On NixOS, `device:setup:udev` prints a `nixosModules.default` import example
for managing udev permissions through your system configuration instead of
writing `/etc/udev/rules.d` directly. Rebuild, reconnect the device, and run
`pnpm run device:doctor`; otherwise the tty node may stay `root:dialout 0660`
and fail with `Permission denied, cannot open /dev/ttyACM*`.

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

# Install udev rules and verify the connected device
pnpm run device:setup:udev
pnpm run device:doctor

# Start the desktop app in the optional Nix dev shell
nix develop -c pnpm run dev
```

The settings UI runs in a Tauri desktop window and communicates with the app
through local IPC. It does not open a fixed localhost HTTP port.

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

Set up permissions for the Loupedeck device:

```bash
pnpm run device:setup:udev
```

Reconnect the device after installing the rule, then run:

```bash
pnpm run device:doctor
```

### Run Or Install With Nix

Run the packaged desktop app directly from the flake:

```bash
nix run github:archfill/loupedeck-linux
```

Install the package into your user profile:

```bash
nix profile install github:archfill/loupedeck-linux
loupedeck-linux
```

On NixOS, use the module to install the app and manage device permissions
together:

```nix
{
  inputs.loupedeck-linux.url = "github:archfill/loupedeck-linux";

  outputs = { nixpkgs, loupedeck-linux, ... }: {
    nixosConfigurations.your-host = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        loupedeck-linux.nixosModules.default
        ({ pkgs, ... }: {
          programs.loupedeck-linux = {
            enable = true;
            package = loupedeck-linux.packages.${pkgs.system}.default;
          };
        })
      ];
    };
  };
}
```

After rebuilding, reconnect the device and run:

```bash
pnpm run device:doctor
```

### Development Checkout

```bash
# Clone repository
git clone https://github.com/archfill/loupedeck-linux.git
cd loupedeck-linux

# Install dependencies
pnpm install

# Device setup check
pnpm run device:doctor

# Start the desktop app from the checkout
nix develop -c pnpm run dev
```

## 💻 Development

```bash
# Tauri desktop app
nix develop -c pnpm run dev

# Web UI type check
pnpm --filter @loupedeck-linux/frontend exec tsc --noEmit
```

### Other Commands

```bash
pnpm run build      # Build desktop app
pnpm run frontend:build  # Build React UI only
pnpm run lint           # Run linter
pnpm run format         # Run formatter
pnpm run device:doctor  # Check device, udev, and native dependencies
```

## 🚀 Desktop Build

```bash
nix develop -c pnpm run build
nix build .#packages.x86_64-linux.default
```

The production desktop binary embeds the built React UI and does not require a
local Web UI port.

### AppImage

Build a portable AppImage from the checkout on a non-Nix Linux environment with
the native Tauri packages installed:

```bash
pnpm run build:appimage
```

The AppImage is written to
`apps/desktop/src-tauri/target/release/bundle/appimage/`. It includes the
Tauri shell, built React assets, sidecar JavaScript, runtime `node_modules`, and
the Node.js runtime used during the build. Device access still requires the udev
rule from `pnpm run device:setup:udev`.

On NixOS, prefer the Nix package for local use. AppImage generation is validated
in the Ubuntu-based GitHub Actions workflow because Tauri's AppImage bundler
expects standard distribution library paths.

### Release

Pushing a `v*` tag builds the AppImage in GitHub Actions and uploads only the
AppImage plus its SHA-256 checksum to the GitHub Release. Nix users should use
the tagged flake directly instead of downloading a release asset.

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

| Command            | Description             |
| ------------------ | ----------------------- |
| `get_config`       | Full configuration      |
| `save_pages`       | Save page configuration |
| `create_page`      | Create a new page       |
| `delete_page`      | Delete a page           |
| `update_page_meta` | Update page metadata    |

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
pnpm run device:doctor
pnpm run device:setup:udev
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
