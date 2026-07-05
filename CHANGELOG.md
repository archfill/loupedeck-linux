# Changelog

All notable changes to this project are documented in this file.

This project follows a human-written changelog for release highlights. GitHub
Release pages are generated from the matching version section plus build and
download metadata.

## [0.1.0] - 2026-07-05

### Highlights

- Initial desktop AppImage release.
- Tauri desktop app with tray integration.
- No local web server or browser port required.
- Nix package support for NixOS users.
- AppImage distribution for general Linux desktop use.

### Added

- AppImage build and GitHub Release workflow.
- Automated release page generation with download, checksum, permissions, Nix,
  change-list, and build metadata sections.
- Nix package and NixOS module support for installing the app and configuring
  device permissions.

### Changed

- Shifted the app direction from a browser-served UI to a portless Tauri
  desktop app.
- Simplified README files for end-user install and setup flows.
