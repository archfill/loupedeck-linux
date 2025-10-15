import { LoupedeckDevice } from './src/device/LoupedeckDevice.ts'
import { GridLayout } from './src/components/GridLayout.ts'
import { WorkspaceButton } from './src/components/WorkspaceButton.ts'
import { VolumeControl } from './src/utils/volumeControl.ts'
import { MediaControl } from './src/utils/mediaControl.ts'
import { HyprlandControl } from './src/utils/hyprlandControl.ts'
import { VolumeHandler } from './src/handlers/VolumeHandler.ts'
import { PageHandler } from './src/handlers/PageHandler.ts'
import { AppLauncher } from './src/utils/appLauncher.ts'
import { logger } from './src/utils/logger.ts'
import { AUTO_UPDATE_INTERVAL_MS, BUTTON_LED_COLORS } from './src/config/constants.ts'
import { ApiServer } from './src/server/api.ts'
import { pagesConfig } from './src/config/pages.ts'
import { watchConfig, stopWatchingConfig } from './src/config/configLoader.ts'
import {
  createComponent,
  type GeneratedComponent,
  type ComponentDependencies,
} from './src/utils/componentFactory.ts'
import type { VolumeDisplay } from './src/components/VolumeDisplay.ts'
import type { MediaDisplay } from './src/components/MediaDisplay.ts'
import type { MediaPlayPauseButton } from './src/components/MediaPlayPauseButton.ts'

/**
 * メイン処理
 */
async function main() {
  let loupedeckDevice: LoupedeckDevice | null = null
  let apiServer: ApiServer | null = null

  try {
    // APIサーバーを起動
    apiServer = new ApiServer(9876)
    await apiServer.start()

    // デバイスに接続
    loupedeckDevice = new LoupedeckDevice()
    await loupedeckDevice.connect()

    logger.info('コンポーネントを配置しています...\n')

    // デバイス情報を表示（物理ボタンの確認）
    loupedeckDevice.showDeviceInfo()

    // 物理ボタンのLED色を設定（デバイス初期化を待つ）
    // 環境変数 SKIP_LED=true でスキップ可能
    if (process.env.SKIP_LED !== 'true') {
      logger.info('物理ボタンのLED色を設定中...')
      await new Promise((resolve) => setTimeout(resolve, 500)) // 500ms待機
      try {
        await loupedeckDevice.setButtonColors(BUTTON_LED_COLORS)
        logger.info('✓ LED色の設定完了\n')
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        logger.warn(`LED色の設定をスキップしました: ${message}\n`)
      }
    } else {
      logger.info('LED色の設定をスキップしました（SKIP_LED=true）\n')
    }

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

    // Hyprland制御を初期化
    const hyprlandControl = new HyprlandControl()
    await hyprlandControl.initialize()

    // GridLayoutを作成
    const device = loupedeckDevice.getDevice()
    if (!device) {
      throw new Error('デバイスが接続されていません')
    }
    const layout = new GridLayout(device)

    // ページ1のコンポーネントを動的生成
    logger.info('ページ1のコンポーネントを動的生成中...')

    const deps: ComponentDependencies = {
      vibration,
      appLauncher,
      volumeControl,
      mediaControl,
    }

    const componentsMap = new Map<string, GeneratedComponent>()
    const componentsList: GeneratedComponent[] = []

    const page1 = pagesConfig[1]
    if (!page1) {
      throw new Error('ページ1の設定が見つかりません')
    }

    for (const [name, config] of Object.entries(page1.components)) {
      try {
        const component = createComponent(name, config, deps)
        componentsMap.set(name, component)
        componentsList.push(component)
        logger.debug(`✓ コンポーネント生成: ${name}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.warn(`⚠️ コンポーネント生成失敗: ${name} - ${message}`)
      }
    }

    // ページ1にコンポーネントを追加（表示を最後に追加して上に重ねる）
    layout.addComponents(componentsList, 1)

    // ページ2: ワークスペース切替ボタン（中段1-5、下段6-10）
    const workspaceButtons: WorkspaceButton[] = []
    for (let i = 1; i <= 10; i++) {
      let col: number
      let row: number

      if (i <= 5) {
        // ワークスペース1-5: 中段（行1）
        col = i - 1
        row = 1
      } else {
        // ワークスペース6-10: 下段（行2）
        col = i - 6
        row = 2
      }

      const wsButton = new WorkspaceButton(col, row, i, hyprlandControl, {
        vibration: vibration,
      })
      workspaceButtons.push(wsButton)
      layout.addComponent(wsButton, 2)
    }

    logger.info('配置完了:')
    logger.info('\n【ページ1: アプリケーション】')
    // 動的生成されたコンポーネントの情報を表示
    for (const [name, config] of Object.entries(page1.components)) {
      if ('position' in config) {
        const label = 'options' in config && 'label' in config.options ? config.options.label : name
        logger.info(`  - ${label}: (列${config.position.col}, 行${config.position.row})`)
      }
    }
    logger.info('\n【ページ2: ワークスペース切替】')
    logger.info('  - 中段（行1）: ワークスペース1-5')
    logger.info('  - 下段（行2）: ワークスペース6-10')
    logger.info('\n【ノブ操作】')
    logger.info('  - 上段ノブ（knobTL）: 回転で音量調整、クリックでミュート切替')
    logger.info('  - 中段ノブ（knobCL）: 回転でページ切替、クリックでページ1に戻る')
    logger.info('\n【ページ切替】')
    logger.info('  - 物理ボタン0（左下）: ページ1へ切り替え')
    logger.info('  - 物理ボタン1（左下から2番目）: ページ2へ切り替え')
    logger.info('\n(Ctrl+C で終了)\n')

    // 自動更新を開始
    const intervalId = layout.startAutoUpdate(AUTO_UPDATE_INTERVAL_MS)

    // メディア再生/一時停止ボタンのアイコン更新を開始（2秒ごと）
    const mediaPlayPauseButton = componentsMap.get('mediaPlayPauseButton') as MediaPlayPauseButton | undefined
    let mediaIconUpdateInterval: NodeJS.Timeout | undefined
    if (mediaPlayPauseButton) {
      mediaIconUpdateInterval = setInterval(async () => {
        await mediaPlayPauseButton.updateIcon()
        await layout.update()
      }, 2000)
    }

    // 特殊なコンポーネントの参照を取得
    const volumeDisplay = componentsMap.get('volumeDisplay') as VolumeDisplay | undefined
    const mediaDisplay = componentsMap.get('mediaDisplay') as MediaDisplay | undefined

    if (!volumeDisplay || !mediaDisplay) {
      logger.warn('⚠️ volumeDisplay または mediaDisplay が見つかりません')
    }

    // 音量ハンドラーを作成
    const volumeHandler = new VolumeHandler(volumeControl, volumeDisplay!, layout, vibration)

    // ページハンドラーを作成
    const pageHandler = new PageHandler(layout, workspaceButtons, vibration)

    // メディアハンドラーを作成（現在は未使用）
    // const mediaHandler = new MediaHandler(mediaControl, mediaDisplay, layout, vibration)

    // タッチイベントハンドラー
    logger.info('タッチイベントハンドラーを登録しています...')
    loupedeckDevice.onTouch(async ({ id, col, row }) => {
      logger.info(`★ タッチされたセル: (列${col}, 行${row}) [ID: ${id}]`)
      await layout.handleTouch(col, row)
    })
    logger.info('タッチイベントハンドラーの登録完了')

    // ノブ回転イベントハンドラー（音量調整とページ切替）
    logger.info('ノブ回転イベントハンドラーを登録しています...')
    loupedeckDevice.on('rotate', async (data: unknown) => {
      const event = data as { id: string; delta: number }
      await volumeHandler.handleRotate(event.id, event.delta)
      await pageHandler.handleRotate(event.id, event.delta)
    })
    logger.info('ノブ回転イベントハンドラーの登録完了')

    // ノブクリックイベントハンドラー（ミュート切り替えとページ1に戻る）
    // 物理ボタン: ページ切替
    logger.info('ノブクリック・物理ボタンイベントハンドラーを登録しています...')
    loupedeckDevice.on('down', async (data: unknown) => {
      const event = data as { id: number | string }
      logger.info(`⬇️  ボタン/ノブが押されました: ID=${event.id}`)

      if (typeof event.id === 'string') {
        // ノブの場合
        await volumeHandler.handleDown(event.id)
        await pageHandler.handleDown(event.id)
      } else {
        // 物理ボタンの場合: ページ切替
        logger.info(`物理ボタン ID=${event.id} でページ切替`)

        // ボタン0 → ページ1、ボタン1 → ページ2
        if (event.id === 0) {
          await layout.switchPage(1)
          await vibration?.vibratePattern('tap')
          logger.info('ページ1に切り替えました（アプリケーション）')
        } else if (event.id === 1) {
          await layout.switchPage(2)
          await vibration?.vibratePattern('tap')
          logger.info('ページ2に切り替えました（ワークスペース切替）')
          // ページ2に切り替えた時に、各ワークスペースボタンのアクティブ状態を更新
          for (const wsButton of workspaceButtons) {
            await wsButton.updateActiveState()
          }
          await layout.update()
        } else {
          logger.debug(`物理ボタン ID=${event.id} は未割り当てです`)
        }
      }
    })
    logger.info('ノブクリック・物理ボタンイベントハンドラーの登録完了')

    // 設定ファイルの監視を開始
    watchConfig(undefined, () => {
      logger.warn('⚠️  設定ファイルが変更されました')
      logger.warn('⚠️  変更を反映するにはアプリケーションを再起動してください')
      logger.warn('⚠️  Ctrl+C で終了後、npm start で再起動してください')
    })

    // 終了処理のセットアップ
    loupedeckDevice.setupExitHandlers(async () => {
      // 設定ファイルの監視を停止
      await stopWatchingConfig()
      logger.debug('自動更新を停止中...')
      layout.stopAutoUpdate(intervalId)
      logger.debug('自動更新を停止しました')

      // メディアアイコン更新を停止
      if (mediaIconUpdateInterval) {
        clearInterval(mediaIconUpdateInterval)
        logger.debug('メディアアイコン更新を停止しました')
      }

      // VolumeDisplayのクリーンアップ
      if (volumeDisplay) {
        volumeDisplay.cleanup()
        logger.debug('VolumeDisplayをクリーンアップしました')
      }

      // MediaDisplayのクリーンアップ
      if (mediaDisplay) {
        mediaDisplay.cleanup()
        logger.debug('MediaDisplayをクリーンアップしました')
      }

      // APIサーバーを停止
      if (apiServer) {
        await apiServer.stop()
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`✗ エラーが発生しました: ${message}`)
    logger.error('\nトラブルシューティング:')
    logger.error('1. デバイスが接続されているか確認してください')
    logger.error('2. udevルールが正しく適用されているか確認してください')
    logger.error('3. 公式Loupedeckソフトウェアが動作していないか確認してください')

    // エラー時もリソースを解放
    if (apiServer) {
      await apiServer.stop()
    }
    if (loupedeckDevice && loupedeckDevice.getDevice()) {
      await loupedeckDevice.disconnect()
    }

    process.exit(1)
  }
}

// アプリケーション起動
main()
