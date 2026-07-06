# Loupedeck Live S setup

This guide covers the real-device setup for the current Tauri desktop app.
The settings UI communicates with the app through local IPC and does not open a
fixed localhost web port. Device control runs as a local sidecar process managed
by the desktop app.

## Supported Device

- Loupedeck Live S: tested
- Other devices supported by `foxxyz/loupedeck`: untested in this app

Known USB IDs for Loupedeck Live S are:

```text
2ec2:0004
2ec2:0006
```

## Recommended Environment

Use the optional Nix dev shell when possible. It provides the native libraries
required by Tauri, including WebKitGTK, GTK3, DBus, appindicator, and
pkg-config.

```bash
nix develop
```

Then install JavaScript dependencies:

```bash
pnpm install
```

`mise` is also supported for language toolchains through `.mise.toml`, but it
does not install system-native Tauri libraries. If you use `mise` without Nix,
install the native packages listed below with your distribution package manager.

## Project Structure

This repository is a pnpm workspace monorepo:

```text
loupedeck-linux/
├── apps/
│   └── desktop/           # Tauri desktop application
│       ├── frontend/      # React + Vite settings UI
│       ├── sidecar/       # Node Loupedeck runtime
│       └── src-tauri/     # Rust/Tauri shell
├── docs/                  # Documentation
├── nix/                   # Nix package and NixOS module
├── scripts/               # Setup, device, and release helpers
├── package.json           # Root scripts and package metadata
└── pnpm-workspace.yaml    # Workspace definition
```

## Non-Nix System Packages

Arch Linux:

```bash
sudo pacman -S nodejs pnpm rust webkit2gtk-4.1 dbus gtk3 libayatana-appindicator pkgconf libusb pamixer playerctl usbutils
```

Ubuntu/Debian:

```bash
sudo apt install nodejs npm libwebkit2gtk-4.1-dev libdbus-1-dev libgtk-3-dev libayatana-appindicator3-dev pkg-config libusb-1.0-0-dev pamixer playerctl usbutils
npm install -g pnpm
```

Optional runtime utilities:

- `pamixer`: PulseAudio volume control
- `playerctl`: media controls

## Device Permissions

Install the udev rule:

```bash
pnpm run device:setup:udev
```

This writes:

```udev
SUBSYSTEM=="usb", ATTR{idVendor}=="2ec2", ATTR{idProduct}=="0004", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="tty", ATTRS{idVendor}=="2ec2", ATTRS{idProduct}=="0004", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="usb", ATTR{idVendor}=="2ec2", ATTR{idProduct}=="0006", MODE="0660", TAG+="uaccess"
SUBSYSTEM=="tty", ATTRS{idVendor}=="2ec2", ATTRS{idProduct}=="0006", MODE="0660", TAG+="uaccess"
```

Reconnect the Loupedeck device after installing the rule.

On NixOS, keep device setup in your NixOS configuration instead of managing
`/etc/udev/rules.d` by hand. This repository exposes a NixOS module:

```nix
{
  imports = [
    inputs.loupedeck-linux.nixosModules.default
  ];

  programs.loupedeck-linux.enable = true;
}
```

After rebuilding, reconnect the device and run `pnpm run device:doctor`.
Without the module, NixOS may expose the serial node as `root:dialout` with
`0660` permissions, which causes `Permission denied, cannot open /dev/ttyACM*`
unless the active seat receives `uaccess` permission.

If you are not using flakes, import the module file directly:

```nix
{
  imports = [
    /path/to/loupedeck-linux/nix/modules/nixos.nix
  ];

  programs.loupedeck-linux.enable = true;
}
```

## Doctor

Run the setup doctor after connecting the device:

```bash
pnpm run device:doctor
```

The doctor checks:

- Node.js, pnpm, Rust/Cargo, and pkg-config
- Tauri native libraries visible to pkg-config
- Loupedeck USB detection via `lsusb`
- udev rule presence
- current user read/write access to the USB device node
- optional runtime utilities

If `pkg-config` or WebKitGTK checks fail outside Nix, enter `nix develop` or
install the missing distro packages.

## Nix Package

Run the packaged desktop app directly from the flake:

```bash
nix run github:archfill/loupedeck-linux
```

Install it into your user profile:

```bash
nix profile install github:archfill/loupedeck-linux
loupedeck-linux
```

Build the package from a checkout:

```bash
nix build .#packages.x86_64-linux.default
```

On NixOS, the module can install the package and configure the Loupedeck udev
permissions at the same time:

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

After rebuilding, reconnect the device and run `pnpm run device:doctor`.

## Start The Desktop App

Development:

```bash
nix develop -c pnpm run dev
```

Useful development commands:

```bash
pnpm run build           # Build the desktop app
pnpm run frontend:build  # Build the React UI only
pnpm run lint            # Run linters
pnpm run format          # Format source and docs
pnpm run device:doctor   # Check device, udev, and native dependencies
```

Production build:

```bash
nix develop -c pnpm run build
```

The production desktop binary embeds the built React UI. It does not require a
fixed web UI port.

## Custom Actions

Loupedeck Linux does not try to know every desktop environment. Buttons execute
the `command` value from your config, so desktop-specific behavior should be
configured as a shell command or a script that exists on your system.

The settings UI writes:

```text
~/.config/loupedeck-linux/config.json
```

Simple commands can be stored directly:

```json
{
  "type": "button",
  "position": { "col": 1, "row": 0 },
  "appName": "media-playback-start",
  "options": {
    "label": "Play/Pause",
    "bgColor": "#222222",
    "borderColor": "#555555",
    "textColor": "#ffffff"
  },
  "command": "playerctl play-pause"
}
```

For anything more environment-specific, put the logic in a script and point the
button at that script:

```json
{
  "type": "button",
  "position": { "col": 2, "row": 0 },
  "options": {
    "label": "Screenshot",
    "bgColor": "#222222",
    "borderColor": "#555555",
    "textColor": "#ffffff"
  },
  "command": "~/.config/loupedeck-linux/actions/screenshot.sh"
}
```

Examples you can adapt:

```bash
# Hyprland workspace
hyprctl dispatch workspace 1

# GNOME screenshot
gnome-screenshot -i

# KDE screenshot
spectacle -r

# MPRIS media control
playerctl play-pause
```

`appName` is only used for icon auto-resolution. It does not have to match the
shell command, and script-based actions can leave it empty or set it to a
desktop icon name manually.

AppImage build on a non-Nix Linux environment with the native Tauri packages
installed:

```bash
pnpm run build:appimage
```

The AppImage is written to
`apps/desktop/src-tauri/target/release/bundle/appimage/`. It bundles the Tauri
shell, built React assets, sidecar JavaScript, runtime `node_modules`, and the
Node.js runtime used during the build. USB access is not bundled; install the
udev rule with `pnpm run device:setup:udev`.

On NixOS, prefer the Nix package for local use. AppImage generation is validated
in the Ubuntu-based GitHub Actions workflow because Tauri's AppImage bundler
expects standard distribution library paths.

Release tags matching `v*` build the AppImage in GitHub Actions and upload only
the AppImage plus its SHA-256 checksum to the GitHub Release. Nix users should
use the tagged flake directly instead of downloading a release asset.

## Release Notes

Release page bodies are generated by `scripts/generate-release-notes.mjs`.
For a release tag, add or update the matching section in `CHANGELOG.md`:

```text
## [0.1.0] - 2026-07-05
```

If no matching changelog section exists, the generator falls back to
`docs/release-notes/<tag>.md`.

Preview the generated body locally:

```bash
pnpm run release:notes -- --tag v0.1.0 --output /tmp/release-notes.md
```

The generated release page includes:

- release notes from the matching `CHANGELOG.md` section
- fallback notes from `docs/release-notes/<tag>.md` when no changelog section exists
- AppImage and checksum file names
- install and checksum verification commands
- Linux device permission notes
- Nix usage notes
- changes since the previous tag
- build metadata

## Troubleshooting

### Device Is Not Detected

Run:

```bash
pnpm run device:doctor
```

If the device is missing:

1. Confirm the USB device is connected.
2. Reconnect the device after installing the udev rule.
3. Confirm no official Loupedeck software is using the device.

Manual USB check:

```bash
lsusb -d 2ec2:
```

### Device Node Exists But Access Fails

Reinstall and reload the udev rule:

```bash
pnpm run device:setup:udev
```

Then reconnect the device. On some desktops, a full logout/login may be needed
for seat permissions to refresh.

On NixOS, apply the NixOS module and rebuild instead of writing the rule
directly. `dialout` group ownership alone is not enough unless your user is in
that group; the module uses `TAG+="uaccess"` so the active desktop session can
open both the USB node and the tty node.

### Tauri Build Fails With pkg-config Errors

This means the current shell cannot see the native Linux libraries required by
Tauri. Use the dev shell:

```bash
nix develop -c pnpm run build
```

Or install the non-Nix system packages listed above.

### Stale Processes Hold The Device

Stop stale app, sidecar, or development processes:

```bash
pnpm run kill
```

Reconnect the device and start again:

```bash
nix develop -c pnpm run dev
```

## Firmware Note

Some firmware versions reported by upstream `foxxyz/loupedeck` users may not
work reliably on Linux. If the USB device is visible and permissions are correct
but connection still fails, check upstream firmware-related issues:

- <https://github.com/foxxyz/loupedeck/issues>
