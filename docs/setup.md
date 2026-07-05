# Loupedeck Live S setup

This guide covers the real-device setup for the current Tauri desktop app.
The settings UI no longer requires the old fixed localhost web port. Device
control runs as a local sidecar process managed by the desktop app.

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

## Non-Nix System Packages

Arch Linux:

```bash
sudo pacman -S nodejs pnpm rust webkit2gtk-4.1 dbus gtk3 libayatana-appindicator pkgconf libusb pamixer playerctl wtype usbutils
```

Ubuntu/Debian:

```bash
sudo apt install nodejs npm libwebkit2gtk-4.1-dev libdbus-1-dev libgtk-3-dev libayatana-appindicator3-dev pkg-config libusb-1.0-0-dev pamixer playerctl wtype usbutils
npm install -g pnpm
```

Optional runtime utilities:

- `pamixer`: PulseAudio volume control
- `playerctl`: media controls
- `wtype`: Wayland keyboard automation used by some example commands

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

## Start The Desktop App

Development:

```bash
nix develop -c pnpm run dev
```

Production build:

```bash
nix develop -c pnpm run build
```

The production desktop binary embeds the built React UI. It does not require a
fixed web UI port.

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
