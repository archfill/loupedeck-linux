#!/bin/bash

set -e  # エラーが発生したら即座に終了

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ロゴ表示
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════╗"
echo "║   Loupedeck Linux Setup Installer   ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"

# 1. Node.js/npmの確認
echo -e "${YELLOW}[1/7]${NC} Node.js/npmのバージョンを確認中..."
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} Node.js ${NODE_VERSION} がインストールされています"
    echo -e "${GREEN}✓${NC} npm ${NPM_VERSION} がインストールされています"
else
    echo -e "${RED}✗${NC} Node.js または npm がインストールされていません"
    echo "以下のコマンドでインストールしてください:"
    echo "  sudo pacman -S nodejs npm"
    exit 1
fi

# 2. usbutilsのインストール確認
echo -e "\n${YELLOW}[2/7]${NC} usbutils (lsusb) の確認中..."
if ! command -v lsusb &> /dev/null; then
    echo -e "${YELLOW}!${NC} lsusb が見つかりません。usbutilsをインストールします..."
    sudo pacman -S --noconfirm usbutils
    echo -e "${GREEN}✓${NC} usbutilsをインストールしました"
else
    echo -e "${GREEN}✓${NC} lsusb が利用可能です"
fi

# 3. Loupedeckデバイスの検出
echo -e "\n${YELLOW}[3/7]${NC} Loupedeckデバイスを検索中..."
LSUSB_OUTPUT=$(lsusb)
if echo "$LSUSB_OUTPUT" | grep -q "2ec2"; then
    DEVICE_INFO=$(echo "$LSUSB_OUTPUT" | grep "2ec2")
    echo -e "${GREEN}✓${NC} Loupedeckデバイスが見つかりました:"
    echo "  $DEVICE_INFO"

    # ベンダーIDとプロダクトIDを抽出
    VENDOR_ID=$(echo "$DEVICE_INFO" | grep -oP '(?<=ID )[0-9a-f]{4}')
    PRODUCT_ID=$(echo "$DEVICE_INFO" | grep -oP '(?<=ID [0-9a-f]{4}:)[0-9a-f]{4}')
    echo "  ベンダーID: $VENDOR_ID"
    echo "  プロダクトID: $PRODUCT_ID"
else
    echo -e "${RED}✗${NC} Loupedeckデバイスが見つかりません"
    echo "デバイスがUSBに接続されているか確認してください"
    exit 1
fi

# 4. udevルールの作成
echo -e "\n${YELLOW}[4/7]${NC} udevルールを作成中..."
UDEV_RULE="SUBSYSTEM==\"usb\", ATTRS{idVendor}==\"$VENDOR_ID\", ATTRS{idProduct}==\"$PRODUCT_ID\", MODE=\"0660\", TAG+=\"uaccess\""
UDEV_FILE="/etc/udev/rules.d/99-loupedeck.rules"

if [ -f "$UDEV_FILE" ]; then
    echo -e "${YELLOW}!${NC} udevルールファイルが既に存在します: $UDEV_FILE"
    echo "  既存の内容:"
    cat "$UDEV_FILE" | sed 's/^/    /'
else
    echo "$UDEV_RULE" | sudo tee "$UDEV_FILE" > /dev/null
    echo -e "${GREEN}✓${NC} udevルールを作成しました: $UDEV_FILE"
    echo "  $UDEV_RULE"
fi

# 5. udevルールの適用
echo -e "\n${YELLOW}[5/7]${NC} udevルールを適用中..."
sudo udevadm control --reload-rules
sudo udevadm trigger
echo -e "${GREEN}✓${NC} udevルールを適用しました"

# 6. ユーザーをuucpグループに追加
echo -e "\n${YELLOW}[6/7]${NC} シリアルポートのアクセス権限を設定中..."
if groups $USER | grep -q '\buucp\b'; then
    echo -e "${GREEN}✓${NC} ユーザー $USER は既にuucpグループに所属しています"
else
    echo -e "${YELLOW}!${NC} ユーザー $USER をuucpグループに追加します..."
    sudo usermod -a -G uucp $USER
    echo -e "${GREEN}✓${NC} ユーザー $USER をuucpグループに追加しました"
    NEED_RELOGIN=true
fi

# 7. npm依存関係のインストール
echo -e "\n${YELLOW}[7/7]${NC} npm依存関係をインストール中..."
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓${NC} 依存関係をインストールしました"
else
    echo -e "${GREEN}✓${NC} 依存関係は既にインストールされています"
fi

# セットアップ完了
echo -e "\n${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     セットアップが完了しました！      ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"

# 次のステップを表示
echo -e "\n${BLUE}次のステップ:${NC}"
if [ "$NEED_RELOGIN" = true ]; then
    echo -e "  1. ${YELLOW}新しいターミナルを開くか、再ログイン${NC}してください"
    echo "     (uucpグループの権限を有効にするため)"
    echo ""
    echo "  2. テストスクリプトを実行してデバイスの動作を確認:"
    echo -e "     ${GREEN}node test.js${NC}"
else
    echo "  テストスクリプトを実行してデバイスの動作を確認:"
    echo -e "     ${GREEN}node test.js${NC}"
fi

echo -e "\n${BLUE}ヒント:${NC}"
echo "  - Ctrl+C でテストスクリプトを終了できます"
echo "  - 公式Loupedeckソフトウェアが起動している場合は停止してください"
echo "  - 問題がある場合はSETUP.mdを参照してください"

echo ""
