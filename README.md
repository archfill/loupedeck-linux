<p align="center">
  <img src="./docs/logo.svg" alt="Loupedeck Linux Logo" width="200" height="200">
</p>

# Loupedeck Linux

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-22-brightgreen)](https://nodejs.org)
[![Package Manager](https://img.shields.io/badge/pnpm-11-red)](https://pnpm.io)

[English](./README.md) | [日本語](./README.ja.md)

An open-source Linux desktop controller for Loupedeck devices. It runs as a
Tauri desktop app with a tray icon, local IPC settings UI, and no fixed
localhost web port.

## Features

- **Supported device**: Loupedeck Live S
- **Desktop app**: Tauri shell with a React settings UI
- **Tray integration**: Starts as a native desktop app, not a browser tab
- **Portless runtime**: Settings UI uses Tauri IPC instead of a fixed HTTP port
- **Controls**: Touchscreen buttons, LED colors, knobs, media controls, and app launchers
- **Hot reload**: Configuration changes are applied without restarting the app

Other Loupedeck devices supported by the upstream `foxxyz/loupedeck` library are
currently untested in this app.

## Portability Status

Generic Linux desktop support is still in progress. The app currently targets
Loupedeck Live S, and some bundled default actions are examples that only work
when the matching desktop tools are installed, such as Firefox, Thunderbird,
`playerctl`, `wpctl`, `grim`, and `wl-copy`. The built-in workspace page is also
still tied to Hyprland behavior and may not work on other desktops or window
managers yet.

Personal helper scripts and local agent settings are intentionally not part of
the supported setup. If an action does not work on your system today, edit
`~/.config/loupedeck-linux/config.json` from the settings UI and replace it with
a command available on your desktop.

## Install / Run

### AppImage

Download the latest `loupedeck-linux-*-x86_64.AppImage` from
[GitHub Releases](https://github.com/archfill/loupedeck-linux/releases), then
run:

```bash
chmod +x loupedeck-linux-*-x86_64.AppImage
./loupedeck-linux-*-x86_64.AppImage
```

Device access may still require the udev rule described below.

### Nix

Run the packaged desktop app directly from the flake:

```bash
nix run github:archfill/loupedeck-linux
```

Install the package into your user profile:

```bash
nix profile install github:archfill/loupedeck-linux
loupedeck-linux
```

On NixOS, use the provided module to install the app and manage device
permissions together. See [docs/setup.md](docs/setup.md#nix-package).

## Device Permissions

The app needs permission to access the Loupedeck USB / serial device.

If you are running from a checkout:

```bash
pnpm run device:setup:udev
pnpm run device:doctor
```

After installing the rule, reconnect the device. AppImage users without a
checkout can copy the udev rules from [docs/setup.md](docs/setup.md#device-permissions).
On NixOS, prefer the NixOS module instead of writing `/etc/udev/rules.d`
directly.

## Configuration

Runtime configuration is stored in:

```text
~/.config/loupedeck-linux/config.json
```

The settings UI updates this file through Tauri IPC. The production app embeds
the React UI and does not require a local web UI port.

## Development

The recommended development environment is the Nix dev shell because Tauri
requires native Linux libraries such as WebKitGTK, GTK3, DBus, and appindicator.

```bash
git clone https://github.com/archfill/loupedeck-linux.git
cd loupedeck-linux
nix develop
pnpm install
pnpm run device:doctor
pnpm run dev
```

`mise` is also supported for Node.js and Rust through `.mise.toml`, but it does
not install the native Tauri libraries. See [docs/setup.md](docs/setup.md) for
non-Nix packages, NixOS module usage, build commands, and troubleshooting.

## Release

Pushing a `v*` tag builds the AppImage in GitHub Actions and uploads only the
AppImage plus its SHA-256 checksum to the GitHub Release. The release workflow
generates the release page body from the matching `CHANGELOG.md` section plus
download, checksum, permissions, Nix, change-list, and build metadata sections.

Nix users should use the tagged flake directly instead of downloading a release
asset.

## Documentation

- [docs/setup.md](docs/setup.md) - setup, Nix, udev, builds, and troubleshooting
- [CHANGELOG.md](CHANGELOG.md) - release history
- [CONTRIBUTING.md](CONTRIBUTING.md) - contribution workflow
- [SECURITY.md](SECURITY.md) - security reporting policy
- [docs/architecture.md](docs/architecture.md) - architecture details
- [docs/component-guide.md](docs/component-guide.md) - component creation guide
- [docs/patterns.md](docs/patterns.md) - common patterns
- [docs/api-reference.md](docs/api-reference.md) - legacy HTTP API reference

## Troubleshooting

### Device Not Recognized

```bash
pnpm run device:doctor
pnpm run device:setup:udev
```

Reconnect the device after changing udev rules. Also make sure official
Loupedeck software is not using the device.

### Application Won't Start

```bash
pnpm run kill
nix develop -c pnpm run dev
```

For more detailed checks, see [docs/setup.md](docs/setup.md#troubleshooting).
