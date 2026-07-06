# Changelog

All notable changes to this project are documented in this file.

This project follows a human-written changelog for release highlights. GitHub
Release pages are generated from the matching version section plus build and
download metadata.

## [0.1.1] - 2026-07-06

### Highlights

- Removed local-only helper scripts and Hyprland-specific workspace runtime from
  the distributed app.
- Switched built-in pages to config-driven command actions so users can map
  buttons to their own shell commands or scripts.
- Simplified the default configuration to avoid desktop-specific launchers and
  screenshot commands.

### Changed

- Page generation now loads all configured pages from `config.json` instead of
  hardcoding a Hyprland workspace page.
- Physical button `page:N` actions now target any configured page.
- Settings UI copy now treats commands and script paths as the supported
  extension point for desktop-specific workflows.
- Documentation now explains custom shell actions and script-based workflows.

### Fixed

- Missing `playerctl` no longer prevents the app from starting.
- API route parameter typing now passes TypeScript checks.

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
