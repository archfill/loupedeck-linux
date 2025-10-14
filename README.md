# Loupedeck Linux

Linux用のLoupedeck Live Sコントローラーアプリケーションです。デバイス制御、アプリケーション起動、音量/メディア制御を提供し、Web UIで設定を確認できます。

## 特徴

- 🎛️ Loupedeck Live Sデバイス制御
- 🖥️ 5×3タッチスクリーングリッドレイアウト
- 🔘 物理ボタンのLEDカラーコントロール
- 🎚️ ノブによる音量・メディア制御
- 📱 アプリケーションランチャー（Firefox、1Password、Thunderbird等）
- 🌐 Web UIで設定表示（React + Vite + TailwindCSS v4）
- 🔐 1Password統合（gnome-keyring使用）
- 💻 Hyprlandワークスペース自動セットアップ

## プロジェクト構成

このプロジェクトはnpm workspacesを使用したモノレポ構成です：

```
loupedeck-linux/
├── main.js                 # メインエントリーポイント
├── src/                    # バックエンドソースコード（JavaScript + TypeScript）
│   ├── components/        # UI コンポーネント（Clock, Button等）
│   ├── config/            # 設定ファイル（components.ts, constants.ts） ✨ TypeScript
│   ├── device/            # デバイス制御（LoupedeckDevice）
│   ├── handlers/          # イベントハンドラー（Volume, Media）
│   ├── server/            # Express API サーバー
│   └── utils/             # ユーティリティ（logger, appLauncher等）
├── scripts/               # Bashスクリプト
│   ├── 1password-setup.sh         # 1Passwordセットアップ
│   ├── 1password-unlock.sh        # 1Passwordロック解除
│   └── workspace-setup.sh         # ワークスペースセットアップ
├── web/                   # フロントエンド（Vite + React + TypeScript）
│   ├── src/
│   │   ├── App.tsx       # メインReactコンポーネント
│   │   ├── index.css     # TailwindCSS v4インポート
│   │   └── lib/          # shadcn/uiユーティリティ
│   ├── vite.config.ts    # Vite設定
│   └── package.json      # Web dependencies
├── package.json           # ルートpackage.json（workspaces設定）
└── README.md             # このファイル
```

## 必須要件

### システム要件

- Linux（Arch Linux推奨）
- Node.js 20以上
- Loupedeck Live Sデバイス

### システムパッケージ

```bash
# Arch Linux
sudo pacman -S nodejs npm libusb

# Ubuntu/Debian
sudo apt install nodejs npm libusb-1.0-0-dev
```

### udevルール設定

Loupedeckデバイスへのアクセス権限を設定：

```bash
# /etc/udev/rules.d/50-loupedeck.rulesを作成
sudo tee /etc/udev/rules.d/50-loupedeck.rules > /dev/null <<EOF
SUBSYSTEM=="usb", ATTR{idVendor}=="2ec2", ATTR{idProduct}=="0004", MODE="0666"
EOF

# udevルールを再読み込み
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### オプション依存パッケージ

音量/メディア制御、アプリケーション起動に必要：

```bash
# Arch Linux
sudo pacman -S pamixer playerctl wtype libsecret firefox thunderbird

# Ubuntu/Debian
sudo apt install pamixer playerctl wtype libsecret-tools firefox thunderbird
```

## セットアップ

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd loupedeck-linux
```

### 2. 依存関係をインストール

```bash
# すべてのワークスペースの依存関係をインストール
npm run install:all

# または手動で
npm install
cd web && npm install && cd ..
```

### 3. スクリプトに実行権限を付与

```bash
chmod +x scripts/*.sh
```

### 4. 1Passwordセットアップ（オプション）

1Passwordを使用する場合：

```bash
./scripts/1password-setup.sh
```

このスクリプトはマスターパスワードをGNOME Keyringに安全に保存します。

## 開発

### バックエンドのみ起動

```bash
npm run dev
# または
npm run dev:info  # INFOレベルログ
```

### Web UIのみ起動

```bash
npm run dev:web
```

Webブラウザで http://localhost:5173 を開きます。

### バックエンド + Web UIを同時起動

```bash
npm run dev:all
```

これにより以下が同時に起動します：
- バックエンド（Loupedeckデバイス制御 + APIサーバー）on port 3000
- Web UI（Vite開発サーバー）on port 5173

### その他のコマンド

```bash
# プロダクションモードで起動
npm start

# Web UIをビルド
npm run build:web

# Web UIプレビュー
npm run preview:web

# TypeScript型チェック
npx tsc --noEmit

# リンター
npm run lint
npm run lint:fix

# フォーマッター
npm run format
npm run format:check
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

- **時計** (0,0): 現在時刻を表示
- **Firefox** (1,0): Firefoxを起動
- **1Password** (2,0): 1Passwordを起動
- **Thunderbird** (3,0): Thunderbirdを起動
- **Setup** (0,1): ワークスペースセットアップスクリプトを実行
- **Unlock** (2,1): 1Passwordロック解除スクリプトを実行

#### ノブ

- **knobTL**（左上）: 音量調整
  - 回転: 音量アップ/ダウン
  - クリック: ミュート切り替え
  - 音量表示が時計の位置にオーバーレイ表示

- **knobCL**（左中央）: メディア制御
  - 回転: 次/前のトラック
  - クリック: 再生/一時停止
  - メディア情報がボタン位置にオーバーレイ表示

#### 物理ボタン（LED付き）

- **ボタン0**（左下）: 白色LED - 機能無効
- **ボタン1**（右上）: 赤色LED - 機能無効
- **ボタン2**（右中央）: 緑色LED - 機能無効
- **ボタン3**（右下）: 青色LED - 機能無効

### Web UI

バックエンドを起動後、ブラウザで http://localhost:3000/api/config にアクセスすると設定をJSON形式で確認できます。

開発環境では http://localhost:5173 でReact UIを表示：
- デバイス情報
- コンポーネントレイアウト
- システム定数

## 設定

### コンポーネント設定

`src/config/components.ts` でボタンの位置、ラベル、色、アイコン、コマンドを設定できます。

**TypeScript型定義により、設定ミスを防止**：
- `ButtonConfig`型で必須フィールドを強制
- 位置（col, row）は`Position`型で型安全
- 振動パターンは`VibrationPattern`型でリテラル値のみ許可

例：
```typescript
export const firefoxButtonConfig: ButtonConfig = {
  position: { col: 1, row: 0 },
  appName: 'firefox',
  command: 'firefox',
  options: {
    label: 'Firefox',
    iconSize: 48,
    bgColor: '#FF7139',
    vibrationPattern: VIBRATION_PATTERNS.TAP,
    // ... その他のオプション
  },
}
```

### システム定数

`src/config/constants.ts` で以下を設定：
- 自動更新間隔
- 音量ステップ
- 表示タイムアウト
- 物理ボタンのLED色
- ノブID

## API エンドポイント

バックエンドAPIサーバー（port 3000）が提供するエンドポイント：

- `GET /api/health` - ヘルスチェック
- `GET /api/config` - 全設定（components, constants, device）
- `GET /api/config/components` - コンポーネント設定のみ
- `GET /api/config/constants` - システム定数のみ
- `GET /api/device` - デバイス情報のみ

## トラブルシューティング

### デバイスが認識されない

1. デバイスが接続されているか確認
2. udevルールが正しく適用されているか確認
3. 公式Loupedeckソフトウェアが動作していないか確認

```bash
# デバイス確認
lsusb | grep Loupedeck

# udevルール確認
cat /etc/udev/rules.d/50-loupedeck.rules
```

### 1Passwordが動作しない

```bash
# 1Passwordがインストールされているか確認
which 1password

# gnome-keyringが動作しているか確認
secret-tool search application 1password
```

### 音量制御が動作しない

```bash
# pamixerがインストールされているか確認
which pamixer

# 音量を手動で確認
pamixer --get-volume
```

### Web UIがAPIに接続できない

1. バックエンドが起動しているか確認（port 3000）
2. CORSが有効になっているか確認（開発環境では自動有効）
3. ファイアウォール設定を確認

## ライセンス

ISC

## 作者

Arch Linux + Hyprland環境で開発されました。
