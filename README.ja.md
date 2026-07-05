<p align="center">
  <img src="./docs/logo.svg" alt="Loupedeck Linux Logo" width="200" height="200">
</p>

# Loupedeck Linux

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![Package Manager](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-red)](https://pnpm.io)

[English](./README.md) | [日本語](./README.ja.md)

Linux向けのLoupedeckデバイスコントローラー。デスクトップ UI で直感的に設定できる、オープンソースのデバイス管理アプリケーションです。

## 🌟 特徴

- 🎮 **対応デバイス**: Loupedeck Live S（他デバイスは動作未確認）
- 🖥️ **タッチスクリーン**: 5×3グリッドレイアウトでカスタムボタンを配置可能
- 💡 **LEDコントロール**: 物理ボタンの色をカスタマイズ
- 🎚️ **ノブ操作**: 音量調整・メディア制御を直感的に操作可能
- 🚀 **アプリケーションランチャー**: よく使うアプリをワンタップで起動
- 🖥️ **Desktop UI**: モダンな Tauri 設定画面（React + Vite + TailwindCSS v4）
- ⚡ **ホットリロード**: 設定変更を即座に反映

## 📁 プロジェクト構成

pnpm workspacesを使用したモノレポ構成です：

```
loupedeck-linux/
├── apps/
│   └── desktop/           # Tauri デスクトップアプリ
│       ├── frontend/      # React + Vite UI
│       ├── sidecar/       # Node Loupedeck runtime
│       └── src-tauri/     # Rust/Tauri shell
├── docs/                  # 詳細ドキュメント
├── scripts/               # 管理スクリプト
├── package.json          # ルート設定
└── pnpm-workspace.yaml   # ワークスペース定義
```

## 📋 必須要件

### システム要件

- Linux（Arch Linuxで動作確認済み）
- Node.js 20以上
- pnpm 9以上
- Tauri 開発用の Rust/Cargo
- Loupedeck Live S（その他のデバイスは動作未確認）

### システムパッケージ

```bash
# Arch Linux
sudo pacman -S nodejs pnpm rust webkit2gtk-4.1 dbus gtk3 libayatana-appindicator pkgconf libusb

# Ubuntu/Debian
sudo apt install nodejs npm libwebkit2gtk-4.1-dev libdbus-1-dev libgtk-3-dev libayatana-appindicator3-dev pkg-config libusb-1.0-0-dev
npm install -g pnpm
```

### udevルール設定

Loupedeckデバイスへのアクセス権限を設定：

```bash
pnpm run device:setup:udev
pnpm run device:doctor
```

NixOS では `/etc/udev/rules.d` へ直接書き込まず、`device:setup:udev` が表示する
`nixosModules.default` の import 例を NixOS 設定に追加してください。rebuild 後に
デバイスを抜き差しして `pnpm run device:doctor` を実行します。未設定だと tty node が
`root:dialout 0660` のままになり、`Permission denied, cannot open /dev/ttyACM*`
になることがあります。

### オプション依存パッケージ

```bash
# Arch Linux
sudo pacman -S pamixer playerctl wtype

# Ubuntu/Debian
sudo apt install pamixer playerctl wtype
```

## 🚀 クイックスタート

```bash
# リポジトリをクローン
git clone https://github.com/archfill/loupedeck-linux.git
cd loupedeck-linux

# 依存関係をインストール
pnpm install

# udev ルールを入れて実機接続を確認
pnpm run device:setup:udev
pnpm run device:doctor

# optional Nix dev shell でデスクトップアプリを起動
nix develop -c pnpm run dev
```

設定画面は Tauri のデスクトップウィンドウで開き、アプリとは local IPC で通信します。
固定の localhost HTTP port は開きません。

## 🔧 詳細セットアップ

### システムパッケージのインストール

Nix ユーザーは optional dev shell の利用を推奨します。Tauri は WebKitGTK、
DBus、appindicator などの Linux native library を必要とするためです。

```bash
nix develop
```

Nix 以外の環境では、Node.js、pnpm、Rust/Cargo、WebKitGTK 4.1、DBus、
GTK3、appindicator、pkg-config を各ディストリビューションの package manager で
インストールしてください。

```bash
# Arch Linux
sudo pacman -S nodejs pnpm rust webkit2gtk-4.1 dbus gtk3 libayatana-appindicator pkgconf libusb pamixer playerctl wtype

# Ubuntu/Debian
sudo apt install nodejs npm libwebkit2gtk-4.1-dev libdbus-1-dev libgtk-3-dev libayatana-appindicator3-dev pkg-config libusb-1.0-0-dev pamixer playerctl wtype
npm install -g pnpm
```

### udevルールの設定

Loupedeckデバイスへのアクセス権限を設定：

```bash
pnpm run device:setup:udev
```

ルールを入れたらデバイスを抜き差しし、診断を実行します。

```bash
pnpm run device:doctor
```

### Nix で実行・インストール

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

rebuild 後にデバイスを抜き差しし、診断を実行します。

```bash
pnpm run device:doctor
```

### 開発 checkout から起動

```bash
# リポジトリをクローン
git clone https://github.com/archfill/loupedeck-linux.git
cd loupedeck-linux

# 依存関係をインストール
pnpm install

# 実機セットアップ確認
pnpm run device:doctor

# checkout からデスクトップアプリを起動
nix develop -c pnpm run dev
```

## 💻 開発

```bash
# Tauri デスクトップアプリ
nix develop -c pnpm run dev

# Web UI の型チェック
pnpm --filter @loupedeck-linux/frontend exec tsc --noEmit
```

### その他のコマンド

```bash
pnpm run build      # デスクトップアプリをビルド
pnpm run frontend:build  # React UIのみビルド
pnpm run lint           # リンター実行
pnpm run format         # フォーマッター実行
pnpm run device:doctor  # 実機、udev、native dependency の診断
```

## 🚀 デスクトップビルド

```bash
nix develop -c pnpm run build
nix build .#packages.x86_64-linux.default
```

production desktop binary は build 済み React UI を内包し、ローカル Web UI ポートを
必要としません。

### AppImage

native Tauri package をインストールした Nix 以外の Linux 環境では、checkout から
portable AppImage をビルドできます。

```bash
pnpm run build:appimage
```

AppImage は `apps/desktop/src-tauri/target/release/bundle/appimage/` に出力されます。
Tauri shell、build 済み React assets、sidecar JavaScript、runtime `node_modules`、
ビルド時に使った Node.js runtime を含みます。デバイスアクセスには引き続き
`pnpm run device:setup:udev` の udev rule が必要です。

NixOS のローカル利用では Nix package を推奨します。Tauri の AppImage bundler は
標準的な distribution の library path を前提にするため、AppImage 生成は Ubuntu
ベースの GitHub Actions workflow で検証します。

### Release

`v*` tag を push すると GitHub Actions で AppImage をビルドし、AppImage と
SHA-256 checksum のみを GitHub Release にアップロードします。Nix ユーザー向けには
release asset を用意せず、tag 済み flake を直接使う想定です。

## 📖 使い方

### デバイスレイアウト

#### タッチスクリーングリッド（5列×3行）

```
列:     0           1           2           3           4
行0: [時計]     [Firefox]  [1Password] [Thunderbird] [ ]
行1: [Setup]    [ ]        [Unlock]    [ ]           [ ]
行2: [ ]        [ ]        [ ]         [ ]           [ ]
```

#### ノブ

| ノブ             | 回転          | クリック      |
| ---------------- | ------------- | ------------- |
| knobTL（左上）   | 音量調整      | ミュート切替  |
| knobCL（左中央） | 次/前トラック | 再生/一時停止 |

### Desktop UI

- 開発: Vite を使う Tauri WebView
- production: React assets を内包した Tauri binary
- 設定通信: 固定 localhost HTTP port ではなく Tauri IPC

## ⚙️ 設定

ランタイム設定は `~/.config/loupedeck-linux/config.json` で管理されます。
設定変更はホットリロードで即座に反映されます。

## Desktop IPC コマンド

設定 UI は固定 HTTP ポートではなく、Tauri shell のローカル IPC と通信します。

| コマンド           | 説明                 |
| ------------------ | -------------------- |
| `get_config`       | 全設定               |
| `save_pages`       | ページ設定の保存     |
| `create_page`      | ページ作成           |
| `delete_page`      | ページ削除           |
| `update_page_meta` | ページメタ情報の更新 |

## 📚 ドキュメント

詳細なドキュメントは `docs/` ディレクトリを参照：

- [architecture.md](docs/architecture.md) - アーキテクチャ詳細
- [component-guide.md](docs/component-guide.md) - コンポーネント作成ガイド
- [api-reference.md](docs/api-reference.md) - 旧 HTTP API リファレンス
- [patterns.md](docs/patterns.md) - 共通パターン
- [setup.md](docs/setup.md) - デバイスセットアップ詳細

## 🔍 トラブルシューティング

### デバイスが認識されない

1. udevルールが適用されているか確認
2. 公式Loupedeckソフトウェアが停止しているか確認
3. デバイスを抜き差し

```bash
pnpm run device:doctor
pnpm run device:setup:udev
```

### アプリケーションが起動しない

```bash
# プロセスを強制終了
pnpm run kill

# デバイスを抜き差し後、再起動
nix develop -c pnpm run dev
```

### その他の問題

[GitHub Issues](https://github.com/archfill/loupedeck-linux/issues)で同じ問題がないか検索するか、新しいIssueを作成してください。

## 🤝 貢献

バグ報告、機能要望、プルリクエストはいつでも歓迎します！

1. リポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'feat: Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを作成

## 📝 ライセンス

MIT License - [LICENSE](./LICENSE) を参照してください。

## ⭐ スターをつける

このプロジェクトが役に立った場合は、GitHubリポジトリにスターをつけてください！

## 🙏 Acknowledgments

本プロジェクトは以下の素晴らしいライブラリを使用しています：

- [foxxyz/loupedeck](https://github.com/foxxyz/loupedeck) - Loupedeck デバイス制御ライブラリ (MIT)
- [node-canvas](https://github.com/Automattic/node-canvas) - Canvas API for Node.js (MIT)
- [Tauri](https://tauri.app/) - Desktop application framework (MIT/Apache-2.0)
- [React](https://react.dev/) - UIライブラリ (MIT)
- [Vite](https://vitejs.dev/) - ビルドツール (MIT)
- [TailwindCSS](https://tailwindcss.com/) - CSSフレームワーク (MIT)
