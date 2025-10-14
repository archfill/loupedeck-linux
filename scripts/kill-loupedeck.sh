#!/bin/bash

# Loupedeckプロセスを強制終了するスクリプト
# npm run devが正常に停止しなかった場合に使用

echo "🔍 Loupedeckに関連するプロセスを検索中..."

# tsxプロセスを検索
TSX_PIDS=$(ps aux | grep -E "tsx.*main.ts" | grep -v grep | awk '{print $2}')

# nodeプロセスを検索
NODE_PIDS=$(ps aux | grep -E "node.*loupedeck" | grep -v grep | awk '{print $2}')

if [ -z "$TSX_PIDS" ] && [ -z "$NODE_PIDS" ]; then
  echo "✓ 関連するプロセスは見つかりませんでした"
  exit 0
fi

# tsxプロセスを終了
if [ -n "$TSX_PIDS" ]; then
  echo "🔪 tsxプロセスを終了中..."
  for PID in $TSX_PIDS; do
    echo "   - PID $PID を終了"
    kill -9 "$PID" 2>/dev/null || true
  done
fi

# nodeプロセスを終了
if [ -n "$NODE_PIDS" ]; then
  echo "🔪 nodeプロセスを終了中..."
  for PID in $NODE_PIDS; do
    echo "   - PID $PID を終了"
    kill -9 "$PID" 2>/dev/null || true
  done
fi

echo ""
echo "✓ プロセスを終了しました"
echo ""
echo "💡 ヒント:"
echo "   - デバイスが接続されているか確認: lsusb | grep Loupedeck"
echo "   - デバイスを抜き差ししてみてください"
echo "   - npm run dev で再起動してください"
