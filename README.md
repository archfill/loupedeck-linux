# Loupedeck Linux

Linux用のLoupedeckコントローラーアプリケーションです。デバイス制御、アプリケーション起動、音量/メディア制御を提供し、Web UIで設定を確認できます。

## 特徴

- Loupedeck Live S / Live / CT デバイス制御
- 5×3タッチスクリーングリッドレイアウト
- 物理ボタンのLEDカラーコントロール
- ノブによる音量・メディア制御
- アプリケーションランチャー
- Web UIで設定表示（React + Vite + TailwindCSS v4）
- 設定のホットリロード対応

## プロジェクト構成

pnpm workspacesを使用したモノレポ構成です：

```
loupedeck-linux/
├── apps/
│   ├── backend/           # バックエンド (@loupedeck-linux/backend)
│   │   ├── main.ts       # エントリーポイント
│   │   ├── src/          # ソースコード
│   │   └── config/       # ランタイム設定
│   └── web/              # フロントエンド (React + Vite)
├── docs/                  # 詳細ドキュメント
├── scripts/               # 管理スクリプト
├── package.json          # ルート設定
└── pnpm-workspace.yaml   # ワークスペース定義
```

## 必須要件

### システム要件

- Linux（Arch Linux推奨）
- Node.js 20以上
- pnpm
- Loupedeck Live S / Live / CT デバイス

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

## セットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd loupedeck-linux

# 依存関係をインストール
pnpm install

# スクリプトに実行権限を付与
chmod +x scripts/*.sh
```

## 開発

```bash
# バックエンドのみ起動
pnpm run dev

# Web UIのみ起動
pnpm run dev:web

# バックエンド + Web UIを同時起動
pnpm run dev:all
```

### その他のコマンド

```bash
pnpm start              # プロダクションモードで起動
pnpm run build:web      # Web UIをビルド
pnpm run lint           # リンター実行
pnpm run format         # フォーマッター実行
```

## 本番環境での自動起動

### systemdサービスのインストール

```bash
pnpm run service:install
```

### サービスの管理

```bash
pnpm run service:status    # ステータス確認
pnpm run service:stop      # 停止
pnpm run service:restart   # 再起動
pnpm run service:logs      # ログ確認
pnpm run service:uninstall # 削除
```

## 使い方

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

### Web UI

- 開発: http://localhost:5173
- API: http://localhost:9876/api/config

## 設定

ランタイム設定は `apps/backend/config/config.json` で管理されます。
設定変更はホットリロードで即座に反映されます。

## API エンドポイント

| エンドポイント               | 説明               |
| ---------------------------- | ------------------ |
| `GET /api/health`            | ヘルスチェック     |
| `GET /api/config`            | 全設定             |
| `GET /api/config/components` | コンポーネント設定 |
| `GET /api/config/constants`  | システム定数       |
| `GET /api/device`            | デバイス情報       |

## ドキュメント

詳細なドキュメントは `docs/` ディレクトリを参照：

- [architecture.md](docs/architecture.md) - アーキテクチャ詳細
- [component-guide.md](docs/component-guide.md) - コンポーネント作成ガイド
- [api-reference.md](docs/api-reference.md) - API リファレンス
- [patterns.md](docs/patterns.md) - 共通パターン
- [setup.md](docs/setup.md) - デバイスセットアップ詳細

## トラブルシューティング

### デバイスが認識されない

1. udevルールが適用されているか確認
2. 公式Loupedeckソフトウェアが停止しているか確認
3. デバイスを抜き差し

```bash
lsusb | grep Loupedeck
```

### 再起動できない

```bash
pnpm run kill
# デバイスを抜き差し後、再起動
pnpm run dev
```

## ライセンス

MIT License - [LICENSE](./LICENSE) を参照してください。

## 謝辞

本プロジェクトは以下の素晴らしいライブラリを使用しています：

- [foxxyz/loupedeck](https://github.com/foxxyz/loupedeck) - Loupedeck デバイス制御ライブラリ (MIT)
- [node-canvas](https://github.com/Automattic/node-canvas) - Canvas API for Node.js (MIT)
- [Express](https://expressjs.com/) - Webサーバーフレームワーク (MIT)
- [React](https://react.dev/) - UIライブラリ (MIT)
- [Vite](https://vitejs.dev/) - ビルドツール (MIT)
- [TailwindCSS](https://tailwindcss.com/) - CSSフレームワーク (MIT)
