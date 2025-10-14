#!/bin/bash

# =============================================================================
# 1Password マスターパスワード セットアップ
# =============================================================================
# このスクリプトは一度だけ実行して、1Passwordのマスターパスワードを
# GNOME Keyringに安全に保存します。
#
# 使い方:
#   ./scripts/1password-setup.sh
#
# セキュリティ:
#   - パスワードはgnome-keyringに暗号化されて保存されます
#   - ログイン時に自動的にロック解除されます
#   - あなたのユーザーアカウントのみアクセス可能です
# =============================================================================

echo "🔐 1Password マスターパスワード セットアップ"
echo "=============================================="
echo ""
echo "1Passwordのマスターパスワードを安全にGNOME Keyring"
echo "（暗号化）に保存します。"
echo ""
echo "⚠️  警告: パスワードはこのシステムに保存されます。"
echo "   このマシンを信頼できる場合のみ続行してください。"
echo ""
read -p "続行しますか？ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ セットアップをキャンセルしました。"
    exit 1
fi

echo ""
echo "1Passwordのマスターパスワードを入力してください:"
secret-tool store --label="1Password Master Password" application 1password

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ パスワードの保存に成功しました！"
    echo ""
    echo "Loupedeckの1Password Unlockボタンが使えるようになりました。"
    echo ""
    echo "保存したパスワードを後で削除する場合:"
    echo "  secret-tool clear application 1password"
else
    echo ""
    echo "❌ パスワードの保存に失敗しました。"
    exit 1
fi
