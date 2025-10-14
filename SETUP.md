# Loupedeck Live S セットアップガイド (Arch Linux)

このガイドでは、Arch Linuxでfoxxyz/loupedeckを使用してLoupedeck Live Sを動作させる手順を説明します。

## 概要

**foxxyz/loupedeck**は、Loupedeck Live、Live S、CT、Razer Stream Controllerに対応した非公式Node.js APIです。

### 機能

- ボタン押下、ノブ回転、タッチイベントの読み取り
- ボタンの色設定
- 画面の輝度調整
- 振動制御

### 対応デバイス

- Loupedeck Live
- Loupedeck Live S
- Loupedeck CT
- Razer Stream Controller
- Razer Stream Controller X

## 要件

- Node.js 20以降
- npm または yarn

## 重要な注意事項

⚠️ **ファームウェアバージョン0.2.26はLinuxで動作しません**

Linuxで使用する場合は、ファームウェアバージョン0.2.23へのダウングレードが推奨されています。詳細は[Issue #30](https://github.com/foxxyz/loupedeck/issues/30)を参照してください。

⚠️ **公式Loupedeckソフトウェアとの競合**

このライブラリを使用する際は、公式Loupedeckソフトウェアが動作していないことを確認してください。競合する可能性があります。

## クイックスタート（自動インストール）

すべてのセットアップを自動で実行する場合は、以下のコマンドを実行してください：

```bash
./install.sh
```

このスクリプトは以下を自動的に実行します：

1. Node.js/npmの確認
2. 必要なツール（lsusb）のインストール
3. Loupedeckデバイスの検出
4. udevルールの作成と適用
5. シリアルポートのアクセス権限設定
6. npm依存関係のインストール

インストール完了後、以下のコマンドでデバイスの動作を確認できます：

```bash
node test.js
```

**注意**: グループ権限の変更が適用されるため、新しいターミナルを開くか、再ログインが必要な場合があります。

## セットアップ手順（手動）

手動でセットアップする場合は、以下の手順に従ってください。

### 1. Node.jsとnpmのインストール

```bash
sudo pacman -S nodejs npm
```

### 2. USBデバイスIDの確認

Loupedeckを接続し、USBデバイスのベンダーIDとプロダクトIDを確認します：

```bash
lsusb
```

出力例：

```
Bus 001 Device 005: ID 2ec2:0004 Loupedeck Loupedeck Live S
```

この例では：

- **ベンダーID**: `2ec2`
- **プロダクトID**: `0004`

### 3. udevルールの作成

udevルールを作成して、一般ユーザーがLoupedeckデバイスにアクセスできるようにします。

```bash
sudo nano /etc/udev/rules.d/99-loupedeck.rules
```

以下の内容を追加します（`xxxx`と`yyyy`は実際のベンダーIDとプロダクトIDに置き換えてください）：

```
# Loupedeck Live S
SUBSYSTEM=="usb", ATTRS{idVendor}=="xxxx", ATTRS{idProduct}=="yyyy", MODE="0660", TAG+="uaccess"
```

**例（Loupedeck Live Sの場合）:**

```
SUBSYSTEM=="usb", ATTRS{idVendor}=="2ec2", ATTRS{idProduct}=="0004", MODE="0660", TAG+="uaccess"
```

**または、すべてのユーザーにアクセス権を与える場合:**

```
SUBSYSTEM=="usb", ATTRS{idVendor}=="2ec2", ATTRS{idProduct}=="0004", MODE="0666"
```

### 4. udevルールの適用

作成したudevルールを適用します：

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

デバイスを一度抜き差しするか、システムを再起動してください。

### 5. シリアルポートのアクセス権限設定

Loupedeckデバイスはシリアルポート（通常は`/dev/ttyACM0`）を使用します。アクセスするためにユーザーを`uucp`グループに追加します：

```bash
sudo usermod -a -G uucp $USER
```

変更を反映させるために、ログアウトして再ログインするか、新しいターミナルセッションを開いてください。

現在のユーザーが`uucp`グループに所属しているか確認：

```bash
groups
```

### 6. loupedeckライブラリのインストール

プロジェクトディレクトリで以下を実行：

```bash
npm install loupedeck
```

グラフィックスを描画する場合は、追加で`canvas`モジュールが必要です：

```bash
npm install canvas
```

## 基本的な使用例

### デバイスの検出とボタンイベントの取得

```javascript
import { discover } from 'loupedeck'

const device = await discover()

// ボタン押下イベント
device.on('down', ({ id }) => {
  console.info(`Button pressed: ${id}`)
})

// ボタン解放イベント
device.on('up', ({ id }) => {
  console.info(`Button released: ${id}`)
})

// ノブ回転イベント
device.on('rotate', ({ id, delta }) => {
  console.info(`Knob ${id} rotated: ${delta}`)
})

// タッチイベント
device.on('touchstart', ({ changedTouches }) => {
  console.info(`Touch started:`, changedTouches)
})
```

### ボタンの色を設定

```javascript
// ボタンの色を赤に設定
await device.setButtonColor({ id: 0, color: 'red' })
```

### 画面の輝度を設定

```javascript
// 輝度を50%に設定
await device.setBrightness(0.5)
```

### 振動を設定

```javascript
// 振動パターンを設定
await device.vibrate([100, 200, 100])
```

## トラブルシューティング

### デバイスが検出されない場合

1. udevルールが正しく適用されているか確認：

   ```bash
   sudo udevadm test $(udevadm info -q path -n /dev/bus/usb/XXX/YYY)
   ```

2. デバイスのパーミッションを確認：

   ```bash
   ls -la /dev/bus/usb/XXX/YYY
   ```

3. 公式Loupedeckソフトウェアが動作していないか確認

### ファームウェアバージョンの確認

デバイスのファームウェアバージョンが0.2.26の場合、Linuxでは動作しません。0.2.23以前のバージョンにダウングレードしてください。

## 参考リンク

- [foxxyz/loupedeck GitHub リポジトリ](https://github.com/foxxyz/loupedeck)
- [Arch Linux udev Wiki](https://wiki.archlinux.org/title/Udev)
- [Node.js 公式サイト](https://nodejs.org/)

## ライセンス

foxxyz/loupedeckライブラリは、元のプロジェクトのライセンスに従います。
