# npx実行機能の設計

## 日付

2026-01-12

## 目的

ローカル開発環境で `npx loupedeck-linux` コマンドを実行できるようにし、バックエンドとWeb UIを同時に起動して、Loupedeckデバイスの制御とWeb UIでの設定ができる状態にする。

## アーキテクチャ

ルートの `package.json` に `bin` フィールドを追加し、シンプルなシェルスクリプトラッパーを作成する。

```
bin/
└── loupedeck-linux    # シェルスクリプト（実行可能フラグ付き）
```

**package.json** の変更点：

- `"private": true` を削除（npxにはpublic設定が必要、ただしnpm registryには公開しない）
- `"bin": { "loupedeck-linux": "./bin/loupedeck-linux" }` を追加

binスクリプトはプロジェクトルートで `pnpm run dev:all` を実行するだけのシンプルなラッパーとする。

## 実装の詳細

### bin/loupedeck-linux

```bash
#!/bin/bash
cd "$(dirname "$0")/.." || exit 1
pnpm run dev:all
```

プロジェクトルートに移動して `pnpm run dev:all` を実行する。

### package.json の修正

```json
{
  "name": "loupedeck-linux",
  "version": "1.0.0",
  "description": "Loupedeck Live S Linux controller application with web UI",
  "bin": {
    "loupedeck-linux": "./bin/loupedeck-linux"
  },
  ...
}
```

`private: true` を削除し、`bin` フィールドを追加する。

### 実行可能フラグの付与

```bash
chmod +x bin/loupedeck-linux
```

## 使用方法と動作確認

### 実行方法

```bash
# プロジェクトルートで
npx loupedeck-linux
```

初回はパッケージのリンクが作成される。2回目以降は即座に起動する。

### 期待される動作

- concurrentlyによってバックエンドとWeb UIが並行起動
- バックエンド: ポート9876でAPIサーバー、Loupedeckデバイスの制御開始
- Web UI: ポート5173でVite開発サーバー
- 終了は `Ctrl+C` で両方のプロセスが停止

### 動作確認手順

1. `pnpm install` を実行（既に済んでいるならスキップ）
2. `npx loupedeck-linux` を実行
3. ブラウザで `http://localhost:5173` にアクセスしてWeb UIが表示されることを確認
4. Loupedeckデバイスが接続されていれば、デバイス制御も開始されていることを確認

## エッジケースと考慮事項

### pnpmがインストールされていない場合

- binスクリプト内でpnpmの存在チェックを追加しても良いが、YAGNI原則で今回は省略
- エラーメッセージはpnpm自身が表示してくれる

### グローバルインストールも可能

- `npm link` または `pnpm link -g` でグローバルにインストールすれば `npx`なしで `loupedeck-linux` コマンドでも実行可能
- これはオプション機能としてドキュメントに記載程度で十分

### privateフラグについて

- `private: true` を削除するが、npm registryに公開する意図はない
- `.npmrc` などで公開を防ぐ設定も可能だが、ローカル利用のみなので今回は不要

### テスト

- 手動テストで `npx loupedeck-linux` が動作することを確認すれば十分
