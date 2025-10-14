# リファクタリング提案

## 現状分析

### コード統計
- **Total src lines**: 1,467行
- **main.js**: 193行（設定、ロジック、イベントハンドラーが混在）

### 主な問題点

## 1. main.jsの肥大化

**問題:**
- コンポーネント設定がmain.js内に直接記述
- イベントハンドラーがmain内に定義
- 設定とビジネスロジックが混在

**影響:**
- 可読性の低下
- テストが困難
- 新しいコンポーネント追加時にmain.jsを編集する必要

**提案:**
```
src/
  config/
    components.js      # コンポーネント設定を分離
    constants.js       # マジックナンバーを定数化
  handlers/
    VolumeHandler.js   # 音量制御関連のイベントハンドラー
    TouchHandler.js    # タッチイベントハンドラー
```

## 2. マジックナンバーの存在

**問題箇所:**
- `delta * 5` - 音量調整ステップ
- `1000` - 自動更新インターバル
- `'knobTL'` - ノブIDのハードコード
- `2000` - 音量表示のタイムアウト

**提案:**
```javascript
// src/config/constants.js
export const VOLUME_STEP_PERCENT = 5
export const AUTO_UPDATE_INTERVAL_MS = 1000
export const VOLUME_DISPLAY_TIMEOUT_MS = 2000
export const KNOB_IDS = {
  TOP_LEFT: 'knobTL',
  CENTER_LEFT: 'knobCL',
}
```

## 3. 重複コード

**問題箇所:**
```javascript
// rotate イベント（110-131行）
volumeDisplay.showTemporarily()
if (vibration) {
  await vibration.vibratePattern('tap')
}
await layout.update()

// down イベント（137-160行）
volumeDisplay.showTemporarily()
if (vibration) {
  if (isMuted) {
    await vibration.vibratePattern('warning')
  } else {
    await vibration.vibratePattern('success')
  }
}
await layout.update()
```

**提案:**
```javascript
// src/handlers/VolumeHandler.js
class VolumeHandler {
  async showVolumeWithFeedback(pattern = 'tap') {
    this.volumeDisplay.showTemporarily()
    if (this.vibration) {
      await this.vibration.vibratePattern(pattern)
    }
    await this.layout.update()
  }
}
```

## 4. コンポーネント設定の肥大化

**問題:**
main.js内でコンポーネントのスタイル設定を直接記述

**提案:**
```javascript
// src/config/components.js
export const componentConfigs = {
  clock: {
    position: { col: 0, row: 0 },
    options: {
      cellBgColor: '#1a1a3e',
      cellBorderColor: '#4466AA',
      timeColor: '#FFFFFF',
      dateColor: '#88AAFF',
      showSeconds: true,
    }
  },
  firefoxButton: {
    position: { col: 1, row: 0 },
    options: {
      label: 'Firefox',
      iconImage: 'assets/icons/firefox.png',
      iconSize: 48,
      bgColor: '#FF6611',
      borderColor: '#FF8833',
      textColor: '#FFFFFF',
      hoverBgColor: '#FF7722',
      vibrationPattern: 'tap',
      command: 'firefox'
    }
  },
  volumeDisplay: {
    position: { col: 0, row: 0 },
    options: {
      cellBgColor: '#1a1a2e',
      cellBorderColor: '#4a6a8a',
      barFillColor: '#4a9eff',
    }
  }
}
```

## 5. launchApp関数の汎用性不足

**問題:**
- 関数名が具体性に欠ける
- アプリケーション起動のみに特化
- 再利用性が低い

**提案:**
```javascript
// src/utils/appLauncher.js
export class AppLauncher {
  constructor(vibration) {
    this.vibration = vibration
  }

  async launch(appName) {
    logger.info(`${appName} を起動中...`)

    try {
      await execAsync(appName)
      logger.info(`✓ ${appName} を起動しました`)
      await this.vibration?.vibratePattern('success')
    } catch (error) {
      logger.error(`✗ ${appName} の起動に失敗しました: ${error.message}`)
      await this.vibration?.vibratePattern('error')
      throw error
    }
  }
}
```

## 6. エラーハンドリングの改善

**問題:**
- グローバルなtry-catchのみ
- 個別の操作でのエラーハンドリングが不足

**提案:**
各ハンドラーで適切なエラーハンドリングを実装

## リファクタリング後の構造

```
src/
  components/          # UI コンポーネント
    Button.js
    Clock.js
    GridLayout.js
    Screen.js
    VolumeDisplay.js

  device/              # デバイス管理
    LoupedeckDevice.js

  handlers/            # イベントハンドラー（新規）
    VolumeHandler.js   # 音量制御イベント
    TouchHandler.js    # タッチイベント

  utils/               # ユーティリティ
    appLauncher.js     # アプリ起動（新規）
    imageLoader.js
    logger.js
    textUtils.js
    vibration.js
    volumeControl.js

  config/              # 設定（新規）
    components.js      # コンポーネント設定
    constants.js       # 定数定義

main.js               # シンプルなエントリーポイント
```

## リファクタリングの優先順位

### Phase 1: 定数の抽出（低リスク）
- マジックナンバーを constants.js に移動
- 影響範囲: 小
- テスト: 既存機能の動作確認のみ

### Phase 2: ハンドラーの分離（中リスク）
- VolumeHandler の作成
- イベントハンドラーを main.js から分離
- 影響範囲: 中
- テスト: イベント処理の動作確認

### Phase 3: コンポーネント設定の分離（低リスク）
- components.js の作成
- main.js の簡素化
- 影響範囲: 小
- テスト: 表示の確認

### Phase 4: AppLauncher の実装（低リスク）
- launchApp を AppLauncher クラスに変更
- 影響範囲: 小
- テスト: アプリ起動の確認

## メリット

1. **保守性の向上**
   - 関心の分離により、各ファイルの責務が明確
   - 変更箇所の特定が容易

2. **テスタビリティの向上**
   - ハンドラーを独立してテスト可能
   - モック化が容易

3. **拡張性の向上**
   - 新しいコンポーネントやハンドラーの追加が容易
   - 設定ファイルのみの変更で機能追加可能

4. **可読性の向上**
   - main.js が簡潔に
   - 各モジュールの役割が明確

## 実装するか？

リファクタリングを実施する場合は、Phase 1から順に進めることを推奨します。
各Phaseごとに動作確認を行い、問題がないことを確認してから次に進みます。
