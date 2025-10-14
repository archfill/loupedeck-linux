#!/bin/bash

# =============================================================================
# 1Password Auto-Unlock Script
# =============================================================================
# This script launches 1Password and automatically unlocks it using the
# master password stored in GNOME Keyring.
#
# Prerequisites:
#   - Run scripts/1password-setup.sh first to store your password
#   - wtype installed (for Wayland keyboard automation)
#   - gnome-keyring running
#
# Usage:
#   ./scripts/1password-unlock.sh
# =============================================================================

# Retrieve the stored password from gnome-keyring
PASSWORD=$(secret-tool lookup application 1password 2>/dev/null)

if [ -z "$PASSWORD" ]; then
    echo "❌ パスワードが見つかりません"
    echo "初回セットアップを実行してください:"
    echo "  ./scripts/1password-setup.sh"
    exit 1
fi

echo "🔐 1Passwordを起動してロック解除中..."

# Check if 1Password is already running
if pgrep -x "1password" > /dev/null; then
    echo "ℹ️  1Passwordは既に起動しています"
    # Focus the window
    hyprctl dispatch focuswindow "1Password"
else
    # Launch 1Password in the background (detached from parent process)
    setsid 1password >/dev/null 2>&1 &
    echo "⏳ 1Passwordのウィンドウを待機中..."
    sleep 3
fi

# Wait a bit more to ensure the unlock field is ready
sleep 0.5

# Type the password using wtype (Wayland)
wtype "$PASSWORD"

# Small delay before pressing Enter
sleep 0.2

# Press Enter to unlock
wtype -k Return

echo "✅ ロック解除コマンドを送信しました"
