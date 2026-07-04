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
│   ├── backend/           # バックエンド (@loupedeck-linux/backend)
│   │   ├── main.ts       # エントリーポイント
│   │   ├── src/          # ソースコード
│   │   └── config/       # ランタイム設定
│   ├── desktop/           # Tauri desktop shell
│   └── web/              # フロントエンド (React + Vite)
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
- Loupedeck Live S（その他のデバイスは動作未確認）

### システムパッケージ

```bash
# Arch Linux
sudo pacman -S nodejs pnpm libusb

# Ubuntu/Debian
sudo apt install nodejs npm libusb-1.0-0-dev
npm install -g pnpm
```

### udevルール設定

Loupedeckデバイスへのアクセス権限を設定：

```bash
sudo tee /etc/udev/rules.d/50-loupedeck.rules > /dev/null <<EOF
SUBSYSTEM=="usb", ATTR{idVendor}=="2ec2", ATTR{idProduct}=="0004", MODE="0666"
EOF

sudo udevadm control --reload-rules
sudo udevadm trigger
```

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

# optional Nix dev shell でデスクトップアプリを起動
nix develop -c pnpm run dev
```

設定画面は Tauri のデスクトップウィンドウで開きます。旧 backend HTTP server
（`127.0.0.1:9876`）は起動しません。

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
sudo tee /etc/udev/rules.d/50-loupedeck.rules > /dev/null <<EOF
SUBSYSTEM=="usb", ATTR{idVendor}=="2ec2", ATTR{idProduct}=="0004", MODE="0666"
EOF

sudo udevadm control --reload-rules
sudo udevadm trigger
```

### アプリケーションのインストール

```bash
# リポジトリをクローン
git clone https://github.com/archfill/loupedeck-linux.git
cd loupedeck-linux

# 依存関係をインストール
pnpm install

# デスクトップアプリを起動
nix develop -c pnpm run dev
```

## 💻 開発

```bash
# Tauri デスクトップアプリ
nix develop -c pnpm run dev

# Web UI の型チェック
pnpm --filter web exec tsc --noEmit
```

### その他のコマンド

```bash
pnpm run build      # デスクトップアプリをビルド
pnpm run web:build  # React UIのみビルド
pnpm run lint           # リンター実行
pnpm run format         # フォーマッター実行
```

## 🚀 デスクトップビルド

```bash
nix develop -c pnpm run build
```

production desktop binary は build 済み React UI を内包し、ローカル Web UI ポートを
必要としません。

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
# デバイス確認
lsusb | grep Loupedeck

# 権限確認
sudo chmod 666 /dev/bus/usb/xxx/yyy
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
