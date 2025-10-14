import { LoupedeckDevice } from './src/device/LoupedeckDevice.js'
import { GridLayout } from './src/components/GridLayout.js'
import { Clock } from './src/components/Clock.js'
import { Button } from './src/components/Button.js'
import { exec } from 'child_process'
import { logger } from './src/utils/logger.js'

/**
 * アプリケーション起動関数
 * @param {string} appName - 起動するアプリケーション名
 * @param {VibrationUtil} vibration - 振動ユーティリティ
 */
function launchApp(appName, vibration = null) {
  logger.info(`${appName} を起動中...`)
  exec(appName, async (error) => {
    if (error) {
      logger.error(`✗ ${appName} の起動に失敗しました: ${error.message}`)
      // 失敗時の振動フィードバック
      if (vibration) {
        await vibration.vibratePattern('error')
      }
    } else {
      logger.info(`✓ ${appName} を起動しました`)
      // 成功時の振動フィードバック
      if (vibration) {
        await vibration.vibratePattern('success')
      }
    }
  })
}

/**
 * メイン処理
 */
async function main() {
  try {
    // デバイスに接続
    const loupedeckDevice = new LoupedeckDevice()
    await loupedeckDevice.connect()

    logger.info('コンポーネントを配置しています...\n')

    // 振動ユーティリティを取得
    const vibration = loupedeckDevice.getVibration()

    // GridLayoutを作成
    const layout = new GridLayout(loupedeckDevice.getDevice())

    // 時計コンポーネント（列0, 行0 = 左上）
    const clock = new Clock(0, 0, {
      cellBgColor: '#1a1a3e',
      cellBorderColor: '#4466AA',
      timeColor: '#FFFFFF',
      dateColor: '#88AAFF',
      showSeconds: true,
    })

    // Firefoxボタン（列1, 行0 = 時計の右）
    const firefoxButton = new Button(1, 0, {
      label: 'Firefox',
      iconImage: 'assets/icons/firefox.png', // 実際のアプリアイコン
      iconSize: 48, // アイコンサイズ
      bgColor: '#FF6611',
      borderColor: '#FF8833',
      textColor: '#FFFFFF',
      hoverBgColor: '#FF7722',
      vibration: vibration, // 振動フィードバック
      vibrationPattern: 'tap', // タップパターン
      onClick: () => launchApp('firefox', vibration),
    })

    // コンポーネントをレイアウトに追加
    layout.addComponents([clock, firefoxButton])

    logger.info('配置完了:')
    logger.info('  - 時計: (列0, 行0)')
    logger.info('  - Firefoxボタン: (列1, 行0)')
    logger.info('\n(Ctrl+C で終了)\n')

    // 自動更新を開始
    const intervalId = layout.startAutoUpdate(1000)

    // タッチイベントハンドラー
    logger.info('タッチイベントハンドラーを登録しています...')
    loupedeckDevice.onTouch(async ({ id, col, row }) => {
      logger.info(`★ タッチされたセル: (列${col}, 行${row}) [ID: ${id}]`)
      await layout.handleTouch(col, row)
    })
    logger.info('タッチイベントハンドラーの登録完了')

    // 終了処理のセットアップ
    loupedeckDevice.setupExitHandlers(async () => {
      logger.debug('自動更新を停止中...')
      layout.stopAutoUpdate(intervalId)
      logger.debug('自動更新を停止しました')
    })
  } catch (error) {
    logger.error(`✗ エラーが発生しました: ${error.message}`)
    logger.error('\nトラブルシューティング:')
    logger.error('1. デバイスが接続されているか確認してください')
    logger.error('2. udevルールが正しく適用されているか確認してください')
    logger.error('3. 公式Loupedeckソフトウェアが動作していないか確認してください')

    // エラー時もデバイスを切断
    if (loupedeckDevice && loupedeckDevice.device) {
      await loupedeckDevice.disconnect()
    }

    process.exit(1)
  }
}

// アプリケーション起動
main()
