# Contributing

Thanks for considering a contribution to Loupedeck Linux.

## Scope

This project currently targets Loupedeck Live S on Linux. Other devices may work
through the upstream `foxxyz/loupedeck` library, but they are not verified in
this app yet.

## Development Setup

The recommended setup is the Nix dev shell because Tauri needs native Linux
libraries such as WebKitGTK, GTK3, DBus, and appindicator.

```bash
nix develop
pnpm install
pnpm run device:doctor
pnpm run dev
```

`mise` is also supported for Node.js and Rust through `.mise.toml`, but it does
not install native Tauri libraries. See [docs/setup.md](docs/setup.md) for
non-Nix package lists and NixOS module setup.

## Checks

Run the focused checks that match your change:

```bash
pnpm run format:check
pnpm run lint
pnpm run test
pnpm run typecheck
```

For Tauri or packaging changes, also run:

```bash
nix develop -c cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml --locked
nix develop -c pnpm --filter @loupedeck-linux/desktop exec tauri build --no-bundle
nix build .#packages.x86_64-linux.default
```

For release workflow changes:

```bash
nix shell nixpkgs#actionlint -c actionlint .github/workflows/release.yml
pnpm run release:notes -- --tag v0.1.0 --output /tmp/release-notes.md
```

## Pull Requests

- Keep changes scoped to one logical topic.
- Update README or docs when behavior, setup, packaging, or release flow changes.
- Add or update tests when changing shared behavior.
- Do not commit local secrets, `.env*` files, generated dumps, or private paths.

## Releases

Human-written release history lives in [CHANGELOG.md](CHANGELOG.md). The
release workflow extracts the matching version section and combines it with
download, checksum, permissions, Nix, change-list, and build metadata.
