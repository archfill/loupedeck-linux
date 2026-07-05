# Tauri portless desktop migration

## Date

2026-07-02

## Goal

Replace the browser-first Web UI and fixed `127.0.0.1:9876` HTTP API with a
Tauri desktop app that uses local IPC for user-facing configuration workflows.

## Target Architecture

```text
apps/desktop
  Tauri shell
  tray/window lifecycle
  Rust commands exposed through invoke()

apps/desktop/frontend
  React settings UI reused inside the Tauri WebView
  no direct localhost API dependency

apps/desktop/sidecar
  device-control core and future sidecar candidate
  HTTP transport removed once the desktop path is stable
```

## Migration Policy

This branch is allowed to make breaking changes. The final target is to remove
the fixed web port, browser Web UI route, Express HTTP API, and systemd user
service once the Tauri desktop path is stable enough for daily use.

Rust and Tauri development dependencies should be easy to set up through a
devshell or mise, but the repository should not require one specific environment
manager. Plain system packages, Nix-based shells, and mise-managed toolchains
should all remain viable.

The optional `flake.nix` devShell provides the Linux native libraries required by
Tauri. The optional `.mise.toml` pins only language toolchains and keeps native
library installation up to the developer's platform.

On this Hyprland/Wayland test environment, WebKitGTK needed
`WEBKIT_DISABLE_DMABUF_RENDERER=1` to avoid a GDK protocol error at startup. The
desktop dev script sets it by default.

## First Vertical Slice

1. Add `apps/desktop` as a Tauri v2 app.
2. Load the existing React UI from `apps/desktop/frontend`.
3. Replace config read/write calls with Tauri commands when running under Tauri.
4. Keep enough browser fallback during development to compare behavior.
5. Verify that `pnpm run dev` opens the settings UI without starting the
   backend HTTP server.

In a Nix environment, use:

```bash
nix develop -c pnpm run dev
```

## Later Work

- Move page operations fully behind the desktop IPC client.
- Add tray actions for open settings, restart device controller, logs, and quit.
- Extract device controller logic from the existing backend into a Node sidecar
  or Rust-native controller.
- Remove the Express server and remaining fixed port documentation.
