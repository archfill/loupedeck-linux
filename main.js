import { LoupedeckDevice } from './src/device/LoupedeckDevice.js'
import { GridLayout } from './src/components/GridLayout.js'
import { Clock } from './src/components/Clock.js'
import { Button } from './src/components/Button.js'
import { VolumeDisplay } from './src/components/VolumeDisplay.js'
import { VolumeControl } from './src/utils/volumeControl.js'
import { VolumeHandler } from './src/handlers/VolumeHandler.js'
import { AppLauncher } from './src/utils/appLauncher.js'
import { logger } from './src/utils/logger.js'
import { AUTO_UPDATE_INTERVAL_MS } from './src/config/constants.js'
import { clockConfig, firefoxButtonConfig, volumeDisplayConfig } from './src/config/components.js'

/**
 * メイン処理
 */
async function main() {
  let loupedeckDevice = null

  try {
    // デバイスに接続
    loupedeckDevice = new LoupedeckDevice()
    await loupedeckDevice.connect()

    logger.info('コンポーネントを配置しています...\n')

    // 振動ユーティリティを取得
    const vibration = loupedeckDevice.getVibration()

    // アプリケーション起動ユーティリティを初期化
    const appLauncher = new AppLauncher(vibration)

    // 音量制御を初期化
    const volumeControl = new VolumeControl()
    await volumeControl.initialize()

    // GridLayoutを作成
    const layout = new GridLayout(loupedeckDevice.getDevice())

    // 時計コンポーネント（列0, 行0 = 左上）
    const clock = new Clock(clockConfig.position.col, clockConfig.position.row, clockConfig.options)

    // Firefoxボタン（列1, 行0 = 時計の右）
    const firefoxButton = new Button(
      firefoxButtonConfig.position.col,
      firefoxButtonConfig.position.row,
      {
        ...firefoxButtonConfig.options,
        vibration: vibration,
        onClick: () => appLauncher.launch(firefoxButtonConfig.command),
      }
    )

    // 音量表示（列0, 行0 = 時計と同じ位置、ノブ操作時のみ表示）
    const volumeDisplay = new VolumeDisplay(
      volumeDisplayConfig.position.col,
      volumeDisplayConfig.position.row,
      volumeControl,
      {
        ...volumeDisplayConfig.options,
        vibration: vibration,
      }
    )

    // コンポーネントをレイアウトに追加（音量表示を最後に追加して上に重ねる）
    layout.addComponents([clock, firefoxButton, volumeDisplay])

    logger.info('配置完了:')
    logger.info(`  - 時計: (列${clockConfig.position.col}, 行${clockConfig.position.row})`)
    logger.info(
      `  - Firefoxボタン: (列${firefoxButtonConfig.position.col}, 行${firefoxButtonConfig.position.row})`
    )
    logger.info(
      `  - 音量表示: (列${volumeDisplayConfig.position.col}, 行${volumeDisplayConfig.position.row}) ← 時計の位置に重ねて一時表示`
    )
    logger.info('\n(Ctrl+C で終了)\n')

    // 自動更新を開始
    const intervalId = layout.startAutoUpdate(AUTO_UPDATE_INTERVAL_MS)

    // 音量ハンドラーを作成
    const volumeHandler = new VolumeHandler(volumeControl, volumeDisplay, layout, vibration)

    // タッチイベントハンドラー
    logger.info('タッチイベントハンドラーを登録しています...')
    loupedeckDevice.onTouch(async ({ id, col, row }) => {
      logger.info(`★ タッチされたセル: (列${col}, 行${row}) [ID: ${id}]`)
      await layout.handleTouch(col, row)
    })
    logger.info('タッチイベントハンドラーの登録完了')

    // ノブ回転イベントハンドラー（音量調整）
    logger.info('ノブ回転イベントハンドラーを登録しています...')
    loupedeckDevice.on('rotate', async ({ id, delta }) => {
      await volumeHandler.handleRotate(id, delta)
    })
    logger.info('ノブ回転イベントハンドラーの登録完了')

    // ノブクリックイベントハンドラー（ミュート切り替え）
    logger.info('ノブクリックイベントハンドラーを登録しています...')
    loupedeckDevice.on('down', async ({ id }) => {
      await volumeHandler.handleDown(id)
    })
    logger.info('ノブクリックイベントハンドラーの登録完了')

    // 終了処理のセットアップ
    loupedeckDevice.setupExitHandlers(async () => {
      logger.debug('自動更新を停止中...')
      layout.stopAutoUpdate(intervalId)
      logger.debug('自動更新を停止しました')

      // VolumeDisplayのクリーンアップ
      volumeDisplay.cleanup()
      logger.debug('VolumeDisplayをクリーンアップしました')
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
