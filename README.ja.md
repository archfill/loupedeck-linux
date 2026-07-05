<p align="center">
  <img src="./docs/logo.svg" alt="Loupedeck Linux Logo" width="200" height="200">
</p>

# Loupedeck Linux

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-22-brightgreen)](https://nodejs.org)
[![Package Manager](https://img.shields.io/badge/pnpm-11-red)](https://pnpm.io)

[English](./README.md) | [日本語](./README.ja.md)

Linux 向けの Loupedeck デバイスコントローラーです。Tauri デスクトップアプリとして動作し、
タスクトレイ、local IPC の設定 UI、固定 localhost Web ポートを使わない構成を備えます。

## 特徴

- **対応デバイス**: Loupedeck Live S
- **デスクトップアプリ**: React 設定 UI を組み込んだ Tauri shell
- **タスクトレイ連携**: ブラウザタブではなく native desktop app として起動
- **Portless runtime**: 固定 HTTP ポートではなく Tauri IPC で設定 UI と通信
- **操作機能**: タッチスクリーン、LED 色、ノブ、メディア制御、アプリランチャー
- **ホットリロード**: 設定変更をアプリ再起動なしで反映

upstream の `foxxyz/loupedeck` が対応する他デバイスは、このアプリでは未検証です。

## 汎用化の状況

汎用的な Linux desktop 対応は作業中です。現時点では Loupedeck Live S を対象にしており、
同梱の初期アクションの一部は Firefox、Thunderbird、`playerctl`、`wpctl`、`grim`、
`wl-copy` など、該当する desktop tool が入っている環境でだけ動くサンプルです。
また、組み込みの workspace ページはまだ Hyprland の挙動に依存しており、他の desktop /
window manager では動かない場合があります。

個人用 helper script やローカル agent 設定は、サポート対象のセットアップには含めません。
今動かないアクションがある場合は、設定 UI から `~/.config/loupedeck-linux/config.json` を更新し、
その desktop で利用できるコマンドに差し替えてください。

## インストール / 起動

### AppImage

[GitHub Releases](https://github.com/archfill/loupedeck-linux/releases) から
最新の `loupedeck-linux-*-x86_64.AppImage` をダウンロードして実行します。

```bash
chmod +x loupedeck-linux-*-x86_64.AppImage
./loupedeck-linux-*-x86_64.AppImage
```

デバイスアクセスには、後述の udev ルールが必要になる場合があります。

### Nix

flake から package 済みデスクトップアプリを直接実行できます。

```bash
nix run github:archfill/loupedeck-linux
```

ユーザー profile にインストールする場合:

```bash
nix profile install github:archfill/loupedeck-linux
loupedeck-linux
```

NixOS では module を使うと、アプリのインストールとデバイス権限設定をまとめて管理できます。
詳細は [docs/setup.md](docs/setup.md#nix-package) を参照してください。

## デバイス権限

アプリが Loupedeck の USB / serial device にアクセスできるようにします。

checkout から実行している場合:

```bash
pnpm run device:setup:udev
pnpm run device:doctor
```

ルールを入れたらデバイスを抜き差ししてください。checkout がない AppImage ユーザーは
[docs/setup.md](docs/setup.md#device-permissions) の udev rule を利用できます。NixOS では
`/etc/udev/rules.d` へ直接書き込むより、NixOS module の利用を推奨します。

## 設定

ランタイム設定は次のファイルで管理されます。

```text
~/.config/loupedeck-linux/config.json
```

設定 UI は Tauri IPC 経由でこのファイルを更新します。production app は React UI を内包し、
ローカル Web UI ポートを必要としません。

## 開発

Tauri は WebKitGTK、GTK3、DBus、appindicator などの native Linux library を必要とするため、
開発環境には Nix dev shell を推奨します。

```bash
git clone https://github.com/archfill/loupedeck-linux.git
cd loupedeck-linux
nix develop
pnpm install
pnpm run device:doctor
pnpm run dev
```

`.mise.toml` により、mise でも Node.js と Rust の toolchain は揃えられます。ただし
native Tauri library は mise では入りません。Nix 以外の system package、NixOS module、
build command、troubleshooting は [docs/setup.md](docs/setup.md) を参照してください。

## Release

`v*` tag を push すると GitHub Actions で AppImage をビルドし、AppImage と
SHA-256 checksum のみを GitHub Release にアップロードします。Release workflow は
該当する `CHANGELOG.md` section と、download、checksum、権限、Nix、変更一覧、
build metadata の各セクションから release page 本文も生成します。

Nix ユーザー向けには release asset を用意せず、tag 済み flake を直接使う想定です。

## ドキュメント

- [docs/setup.md](docs/setup.md) - setup、Nix、udev、build、troubleshooting
- [CHANGELOG.md](CHANGELOG.md) - release history
- [CONTRIBUTING.md](CONTRIBUTING.md) - contribution workflow
- [SECURITY.md](SECURITY.md) - security reporting policy
- [docs/architecture.md](docs/architecture.md) - アーキテクチャ詳細
- [docs/component-guide.md](docs/component-guide.md) - コンポーネント作成ガイド
- [docs/patterns.md](docs/patterns.md) - 共通パターン
- [docs/api-reference.md](docs/api-reference.md) - 旧 HTTP API リファレンス

## トラブルシューティング

### デバイスが認識されない

```bash
pnpm run device:doctor
pnpm run device:setup:udev
```

udev ルールを変更したらデバイスを抜き差ししてください。公式 Loupedeck software が
デバイスを使用していないことも確認します。

### アプリケーションが起動しない

```bash
pnpm run kill
nix develop -c pnpm run dev
```

より詳細な確認は [docs/setup.md](docs/setup.md#troubleshooting) を参照してください。
