import { LoupedeckDevice } from './src/device/LoupedeckDevice.js'
import { GridLayout } from './src/components/GridLayout.js'
import { Clock } from './src/components/Clock.js'
import { Button } from './src/components/Button.js'
import { VolumeDisplay } from './src/components/VolumeDisplay.js'
import { MediaDisplay } from './src/components/MediaDisplay.js'
import { VolumeControl } from './src/utils/volumeControl.js'
import { MediaControl } from './src/utils/mediaControl.js'
import { VolumeHandler } from './src/handlers/VolumeHandler.js'
import { MediaHandler } from './src/handlers/MediaHandler.js'
import { AppLauncher } from './src/utils/appLauncher.js'
import { IconResolver } from './src/utils/iconResolver.js'
import { logger } from './src/utils/logger.js'
import { AUTO_UPDATE_INTERVAL_MS, BUTTON_LED_COLORS } from './src/config/constants.js'
import { ApiServer } from './src/server/api.js'
import {
  clockConfig,
  firefoxButtonConfig,
  onePasswordButtonConfig,
  thunderbirdButtonConfig,
  volumeDisplayConfig,
  mediaDisplayConfig,
  workspaceSetupButtonConfig,
  onePasswordUnlockButtonConfig,
} from './src/config/components.js'

/**
 * メイン処理
 */
async function main() {
  let loupedeckDevice = null
  let apiServer = null

  try {
    // APIサーバーを起動
    apiServer = new ApiServer(3000)
    await apiServer.start()

    // デバイスに接続
    loupedeckDevice = new LoupedeckDevice()
    await loupedeckDevice.connect()

    logger.info('コンポーネントを配置しています...\n')

    // デバイス情報を表示（物理ボタンの確認）
    loupedeckDevice.showDeviceInfo()

    // 物理ボタンのLED色を設定（デバイス初期化を待つ）
    logger.info('物理ボタンのLED色を設定中...')
    await new Promise((resolve) => setTimeout(resolve, 500)) // 500ms待機
    await loupedeckDevice.setButtonColors(BUTTON_LED_COLORS)
    logger.info('✓ LED色の設定完了\n')

    // 振動ユーティリティを取得
    const vibration = loupedeckDevice.getVibration()

    // アプリケーション起動ユーティリティを初期化
    const appLauncher = new AppLauncher(vibration)

    // 音量制御を初期化
    const volumeControl = new VolumeControl()
    await volumeControl.initialize()

    // メディア制御を初期化
    const mediaControl = new MediaControl()
    await mediaControl.initialize()

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
        iconImage: IconResolver.resolve(firefoxButtonConfig.appName),
        vibration: vibration,
        onClick: () => appLauncher.launch(firefoxButtonConfig.command),
      }
    )

    // 1Passwordボタン（列2, 行0）
    const onePasswordButton = new Button(
      onePasswordButtonConfig.position.col,
      onePasswordButtonConfig.position.row,
      {
        ...onePasswordButtonConfig.options,
        iconImage: IconResolver.resolve(onePasswordButtonConfig.appName),
        vibration: vibration,
        onClick: () => appLauncher.launch(onePasswordButtonConfig.command),
      }
    )

    // Thunderbirdボタン（列3, 行0）
    const thunderbirdButton = new Button(
      thunderbirdButtonConfig.position.col,
      thunderbirdButtonConfig.position.row,
      {
        ...thunderbirdButtonConfig.options,
        iconImage: IconResolver.resolve(thunderbirdButtonConfig.appName),
        vibration: vibration,
        onClick: () => appLauncher.launch(thunderbirdButtonConfig.command),
      }
    )

    // ワークスペースセットアップボタン（列0, 行1）
    const workspaceSetupButton = new Button(
      workspaceSetupButtonConfig.position.col,
      workspaceSetupButtonConfig.position.row,
      {
        ...workspaceSetupButtonConfig.options,
        iconImage: IconResolver.resolve(workspaceSetupButtonConfig.appName),
        vibration: vibration,
        onClick: () => appLauncher.launch(workspaceSetupButtonConfig.command),
      }
    )

    // 1Passwordロック解除ボタン（列2, 行1）
    const onePasswordUnlockButton = new Button(
      onePasswordUnlockButtonConfig.position.col,
      onePasswordUnlockButtonConfig.position.row,
      {
        ...onePasswordUnlockButtonConfig.options,
        iconImage: IconResolver.resolve(onePasswordUnlockButtonConfig.appName),
        vibration: vibration,
        onClick: () => appLauncher.launch(onePasswordUnlockButtonConfig.command),
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

    // メディア表示（列2, 行0、ノブ操作時のみ表示）
    const mediaDisplay = new MediaDisplay(
      mediaDisplayConfig.position.col,
      mediaDisplayConfig.position.row,
      mediaControl,
      {
        ...mediaDisplayConfig.options,
        vibration: vibration,
      }
    )

    // コンポーネントをレイアウトに追加（表示を最後に追加して上に重ねる）
    layout.addComponents([
      clock,
      firefoxButton,
      onePasswordButton,
      thunderbirdButton,
      workspaceSetupButton,
      onePasswordUnlockButton,
      volumeDisplay,
      mediaDisplay,
    ])

    logger.info('配置完了:')
    logger.info(`  - 時計: (列${clockConfig.position.col}, 行${clockConfig.position.row})`)
    logger.info(
      `  - Firefoxボタン: (列${firefoxButtonConfig.position.col}, 行${firefoxButtonConfig.position.row})`
    )
    logger.info(
      `  - 1Passwordボタン: (列${onePasswordButtonConfig.position.col}, 行${onePasswordButtonConfig.position.row})`
    )
    logger.info(
      `  - Thunderbirdボタン: (列${thunderbirdButtonConfig.position.col}, 行${thunderbirdButtonConfig.position.row})`
    )
    logger.info(
      `  - セットアップボタン: (列${workspaceSetupButtonConfig.position.col}, 行${workspaceSetupButtonConfig.position.row})`
    )
    logger.info(
      `  - 1Passwordロック解除ボタン: (列${onePasswordUnlockButtonConfig.position.col}, 行${onePasswordUnlockButtonConfig.position.row})`
    )
    logger.info(
      `  - 音量表示: (列${volumeDisplayConfig.position.col}, 行${volumeDisplayConfig.position.row}) ← 時計の位置に重ねて一時表示`
    )
    logger.info(
      `  - メディア表示: (列${mediaDisplayConfig.position.col}, 行${mediaDisplayConfig.position.row}) ← 一時表示`
    )
    logger.info('\n(Ctrl+C で終了)\n')

    // 自動更新を開始
    const intervalId = layout.startAutoUpdate(AUTO_UPDATE_INTERVAL_MS)

    // 音量ハンドラーを作成
    const volumeHandler = new VolumeHandler(volumeControl, volumeDisplay, layout, vibration)

    // メディアハンドラーを作成
    const mediaHandler = new MediaHandler(mediaControl, mediaDisplay, layout, vibration)

    // タッチイベントハンドラー
    logger.info('タッチイベントハンドラーを登録しています...')
    loupedeckDevice.onTouch(async ({ id, col, row }) => {
      logger.info(`★ タッチされたセル: (列${col}, 行${row}) [ID: ${id}]`)
      await layout.handleTouch(col, row)
    })
    logger.info('タッチイベントハンドラーの登録完了')

    // ノブ回転イベントハンドラー（音量調整とメディア操作）
    logger.info('ノブ回転イベントハンドラーを登録しています...')
    loupedeckDevice.on('rotate', async ({ id, delta }) => {
      await volumeHandler.handleRotate(id, delta)
      await mediaHandler.handleRotate(id, delta)
    })
    logger.info('ノブ回転イベントハンドラーの登録完了')

    // ノブクリックイベントハンドラー（ミュート切り替えと再生/一時停止）
    logger.info('ノブクリックイベントハンドラーを登録しています...')
    loupedeckDevice.on('down', async ({ id }) => {
      logger.info(`⬇️  ボタン/ノブが押されました: ID=${id}`)

      // ノブのみ処理（物理ボタンは無効化）
      if (typeof id === 'string') {
        await volumeHandler.handleDown(id)
        await mediaHandler.handleDown(id)
      } else {
        logger.debug(`物理ボタン ID=${id} は無効化されています`)
      }
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

      // MediaDisplayのクリーンアップ
      mediaDisplay.cleanup()
      logger.debug('MediaDisplayをクリーンアップしました')

      // APIサーバーを停止
      if (apiServer) {
        await apiServer.stop()
      }
    })
  } catch (error) {
    logger.error(`✗ エラーが発生しました: ${error.message}`)
    logger.error('\nトラブルシューティング:')
    logger.error('1. デバイスが接続されているか確認してください')
    logger.error('2. udevルールが正しく適用されているか確認してください')
    logger.error('3. 公式Loupedeckソフトウェアが動作していないか確認してください')

    // エラー時もリソースを解放
    if (apiServer) {
      await apiServer.stop()
    }
    if (loupedeckDevice && loupedeckDevice.device) {
      await loupedeckDevice.disconnect()
    }

    process.exit(1)
  }
}

// アプリケーション起動
main()
