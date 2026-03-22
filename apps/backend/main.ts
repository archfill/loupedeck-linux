import { LoupedeckDevice } from './src/device/LoupedeckDevice.ts'
import type { VibrationUtil } from './src/utils/vibration.ts'
import { GridLayout } from './src/components/GridLayout.ts'
import { WorkspaceButton } from './src/components/WorkspaceButton.ts'
import { VolumeControl } from './src/utils/volumeControl.ts'
import { MediaControl } from './src/utils/mediaControl.ts'
import { HyprlandControl } from './src/utils/hyprlandControl.ts'
import { VolumeHandler } from './src/handlers/VolumeHandler.ts'
import { PageHandler } from './src/handlers/PageHandler.ts'
import { PhysicalButtonHandler } from './src/handlers/PhysicalButtonHandler.ts'
import { NotificationHandler } from './src/handlers/NotificationHandler.ts'
import { AppLauncher } from './src/utils/appLauncher.ts'
import { NotificationListener } from './src/utils/notificationListener.ts'
import { logger } from './src/utils/logger.ts'
import { AUTO_UPDATE_INTERVAL_MS } from './src/config/constants.ts'
import { ApiServer } from './src/server/api.ts'
import {
  watchConfig,
  stopWatchingConfig,
  clearConfigCache,
  loadConfig,
  convertToPageConfig,
  extractPhysicalButtonConfigs,
  extractLedColors,
} from './src/config/configLoader.ts'
import {
  createComponent,
  type GeneratedComponent,
  type ComponentDependencies,
} from './src/utils/componentFactory.ts'
import type { VolumeDisplay } from './src/components/VolumeDisplay.ts'
import type { MediaDisplay } from './src/components/MediaDisplay.ts'
import type { NotificationDisplay } from './src/components/NotificationDisplay.ts'
import type { MediaPlayPauseButton } from './src/components/MediaPlayPauseButton.ts'
import type { Button } from './src/components/Button.ts'

/**
 * コンポーネントを生成してレイアウトに追加する関数
 */
async function buildComponents(
  layout: GridLayout,
  deps: ComponentDependencies,
  hyprlandControl: HyprlandControl,
  vibration: VibrationUtil | null
): Promise<{
  componentsMap: Map<string, GeneratedComponent>
  workspaceButtons: WorkspaceButton[]
  volumeDisplay: VolumeDisplay | undefined
  mediaDisplay: MediaDisplay | undefined
  notificationDisplay: NotificationDisplay | undefined
  physicalButtonConfigs: Map<number, Record<string, unknown>>
}> {
  // キャッシュをクリアして最新の設定を読み込む
  clearConfigCache()
  const config = loadConfig()
  const pages = convertToPageConfig(config)

  const componentsMap = new Map<string, GeneratedComponent>()
  const componentsList: GeneratedComponent[] = []

  const page1 = pages[1]
  if (!page1) {
    throw new Error('ページ1の設定が見つかりません')
  }

  // ページ1のコンポーネントを生成
  logger.info('ページ1のコンポーネントを動的生成中...')
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

  // レイアウトをクリアして新しいコンポーネントを追加
  layout.clearPage(1)
  layout.addComponents(componentsList, 1)

  // ページ2: ワークスペース切替ボタン
  const workspaceButtons: WorkspaceButton[] = []
  layout.clearPage(2)

  for (let i = 1; i <= 10; i++) {
    let col: number
    let row: number

    if (i <= 5) {
      col = i - 1
      row = 1
    } else {
      col = i - 6
      row = 2
    }

    const wsButton = new WorkspaceButton(col, row, i, hyprlandControl, {
      vibration: vibration,
    })
    workspaceButtons.push(wsButton)
    layout.addComponent(wsButton, 2)
  }

  // 特殊なコンポーネントの参照を取得
  const volumeDisplay = componentsMap.get('volumeDisplay') as VolumeDisplay | undefined
  const mediaDisplay = componentsMap.get('mediaDisplay') as MediaDisplay | undefined
  const notificationDisplay = componentsMap.get('notificationDisplay') as
    | NotificationDisplay
    | undefined

  logger.info('配置完了:')
  logger.info('\n【ページ1: アプリケーション】')
  for (const [name, config] of Object.entries(page1.components)) {
    if ('position' in config) {
      const label = 'options' in config && 'label' in config.options ? config.options.label : name
      logger.info(`  - ${label}: (列${config.position.col}, 行${config.position.row})`)
    }
  }

  await layout.update()

  // 物理ボタン設定を抽出
  const physicalButtonConfigs = extractPhysicalButtonConfigs(config)

  return {
    componentsMap,
    workspaceButtons,
    volumeDisplay,
    mediaDisplay,
    notificationDisplay,
    physicalButtonConfigs,
  }
}

/**
 * メイン処理
 */
async function main() {
  let apiServer: ApiServer | null = null

  try {
    // デバイスに接続（APIサーバーより先に作成してgetConnectionStateを渡せるようにする）
    const loupedeckDevice = new LoupedeckDevice()

    // APIサーバーを起動（接続状態ゲッターを渡す）
    apiServer = new ApiServer(9876, () => loupedeckDevice.getConnectionState())
    await apiServer.start()

    await loupedeckDevice.connect()

    // 長期生存オブジェクト（再接続をまたいで生き続ける）
    const volumeControl = new VolumeControl()
    await volumeControl.initialize()

    const mediaControl = new MediaControl()
    await mediaControl.initialize()

    const hyprlandControl = new HyprlandControl()
    await hyprlandControl.initialize()

    const notificationListener = new NotificationListener()

    // appLauncherは再接続時に振動参照を更新する必要があるため後で初期化
    let appLauncher = new AppLauncher(loupedeckDevice.getVibration())

    // デバイス依存状態（再接続のたびに再構築）
    let intervalId: NodeJS.Timeout | null = null
    let mediaIconUpdateInterval: NodeJS.Timeout | undefined

    // setupDeviceState内で使うためにスコープを広げる
    let currentVolumeDisplay: VolumeDisplay | undefined
    let currentMediaDisplay: MediaDisplay | undefined
    let currentNotificationDisplay: NotificationDisplay | undefined
    let currentNotificationHandler: NotificationHandler | null = null
    let currentLayout: GridLayout | null = null

    async function teardownDeviceState(): Promise<void> {
      // 自動更新を停止
      if (intervalId !== null && currentLayout) {
        currentLayout.stopAutoUpdate(intervalId)
        intervalId = null
        logger.debug('自動更新を停止しました')
      }

      // メディアアイコン更新を停止
      if (mediaIconUpdateInterval) {
        clearInterval(mediaIconUpdateInterval)
        mediaIconUpdateInterval = undefined
        logger.debug('メディアアイコン更新を停止しました')
      }

      // 設定ファイルの監視を停止
      await stopWatchingConfig()

      // VolumeDisplayのクリーンアップ
      if (currentVolumeDisplay) {
        currentVolumeDisplay.cleanup()
        currentVolumeDisplay = undefined
        logger.debug('VolumeDisplayをクリーンアップしました')
      }

      // MediaDisplayのクリーンアップ
      if (currentMediaDisplay) {
        currentMediaDisplay.cleanup()
        currentMediaDisplay = undefined
        logger.debug('MediaDisplayをクリーンアップしました')
      }

      if (currentNotificationDisplay) {
        currentNotificationDisplay.cleanup()
        currentNotificationDisplay = undefined
        logger.debug('NotificationDisplayをクリーンアップしました')
      }

      // 通知ハンドラーを停止
      if (currentNotificationHandler) {
        await currentNotificationHandler.stop()
        currentNotificationHandler = null
      }

      currentLayout = null
    }

    async function setupDeviceState(isReconnect = false): Promise<void> {
      logger.info('コンポーネントを配置しています...\n')

      // デバイス情報を表示
      loupedeckDevice.showDeviceInfo()

      // 振動ユーティリティを取得（再接続後は新しいインスタンス）
      const vibration = loupedeckDevice.getVibration()

      // appLauncherの振動参照を更新
      appLauncher = new AppLauncher(vibration)

      // GridLayoutを作成
      const device = loupedeckDevice.getDevice()
      if (!device) {
        throw new Error('デバイスが接続されていません')
      }
      currentLayout = new GridLayout(device)

      // 依存関係を準備
      const deps: ComponentDependencies = {
        vibration,
        appLauncher,
        volumeControl,
        mediaControl,
      }

      // コンポーネントを生成してレイアウトに追加
      const initialBuildResult = await buildComponents(
        currentLayout,
        deps,
        hyprlandControl,
        vibration
      )
      let { componentsMap, workspaceButtons } = initialBuildResult
      const { physicalButtonConfigs } = initialBuildResult
      currentVolumeDisplay = initialBuildResult.volumeDisplay
      currentMediaDisplay = initialBuildResult.mediaDisplay
      currentNotificationDisplay = initialBuildResult.notificationDisplay

      // 物理ボタンのLED色を設定
      // 再接続時は5秒待機をスキップ、通常起動時はSKIP_LED=trueでスキップ可能
      if (!isReconnect && process.env.SKIP_LED !== 'true') {
        logger.info('物理ボタンのLED色を設定中...')
        await new Promise((resolve) => setTimeout(resolve, 5000)) // 5秒待機（tsx watch modeのプロセス終了待機）
        try {
          const config = loadConfig()
          const ledColors = extractLedColors(config)
          await loupedeckDevice.setButtonColors(ledColors)
          logger.info('✓ LED色の設定完了\n')
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)
          logger.warn(`LED色の設定をスキップしました: ${message}\n`)
        }
      } else if (isReconnect) {
        try {
          const config = loadConfig()
          const ledColors = extractLedColors(config)
          await loupedeckDevice.setButtonColors(ledColors)
          logger.info('✓ LED色の設定完了\n')
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)
          logger.warn(`LED色の設定をスキップしました: ${message}\n`)
        }
      } else {
        logger.info('LED色の設定をスキップしました（SKIP_LED=true）\n')
      }

      if (!currentVolumeDisplay || !currentMediaDisplay) {
        logger.warn('⚠️ volumeDisplay または mediaDisplay が見つかりません')
      }

      if (currentNotificationDisplay) {
        currentNotificationHandler = new NotificationHandler(
          notificationListener,
          currentNotificationDisplay,
          currentLayout
        )
        await currentNotificationHandler.start()
      } else {
        logger.warn('⚠️ notificationDisplay が見つかりません')
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
      intervalId = currentLayout.startAutoUpdate(AUTO_UPDATE_INTERVAL_MS)

      // メディア再生/一時停止ボタンのアイコン更新を開始（2秒ごと）
      const updateMediaIcon = () => {
        const mediaPlayPauseButton = componentsMap.get('mediaPlayPauseButton') as
          | MediaPlayPauseButton
          | undefined
        if (mediaPlayPauseButton && currentLayout) {
          mediaPlayPauseButton.updateIcon().then(() => currentLayout!.update())
        }
      }
      mediaIconUpdateInterval = setInterval(updateMediaIcon, 2000)

      // 音量ハンドラーを作成
      let volumeHandler = new VolumeHandler(
        volumeControl,
        currentVolumeDisplay!,
        currentLayout,
        vibration
      )

      // ページハンドラーを作成
      let pageHandler = new PageHandler(currentLayout, workspaceButtons, vibration)

      // 物理ボタンハンドラーを作成
      let physicalButtonHandler = new PhysicalButtonHandler(
        appLauncher,
        currentLayout,
        workspaceButtons,
        vibration,
        physicalButtonConfigs as Map<number, Button>
      )

      // タッチイベントハンドラー
      logger.info('タッチイベントハンドラーを登録しています...')
      loupedeckDevice.onTouch(async ({ id, col, row }) => {
        logger.info(`★ タッチされたセル: (列${col}, 行${row}) [ID: ${id}]`)
        if (currentLayout) await currentLayout.handleTouch(col, row)
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
      // 物理ボタン: 設定ファイルベースの動作
      logger.info('ノブクリック・物理ボタンイベントハンドラーを登録しています...')
      loupedeckDevice.on('down', async (data: unknown) => {
        const event = data as { id: number | string }
        logger.info(`⬇️  ボタン/ノブが押されました: ID=${event.id}`)

        if (typeof event.id === 'string') {
          // ノブの場合
          await volumeHandler.handleDown(event.id)
          await pageHandler.handleDown(event.id)
        } else {
          // 物理ボタンの場合: PhysicalButtonHandlerで処理
          await physicalButtonHandler.handleDown(event.id)
        }
      })
      logger.info('ノブクリック・物理ボタンイベントハンドラーの登録完了')

      // 設定ファイルの監視を開始（ホットリロード）
      watchConfig(undefined, async () => {
        logger.info('📝 設定ファイルが変更されました')
        logger.info('🔄 自動的に設定を再読み込みします...')

        try {
          // 古いコンポーネントのクリーンアップ
          if (currentVolumeDisplay) currentVolumeDisplay.cleanup()
          if (currentMediaDisplay) currentMediaDisplay.cleanup()
          if (currentNotificationDisplay) currentNotificationDisplay.cleanup()
          if (currentNotificationHandler) {
            await currentNotificationHandler.stop()
            currentNotificationHandler = null
          }
          if (mediaIconUpdateInterval) {
            clearInterval(mediaIconUpdateInterval)
          }

          if (!currentLayout) {
            throw new Error('レイアウトが初期化されていません')
          }

          // コンポーネントを再生成
          const result = await buildComponents(currentLayout, deps, hyprlandControl, vibration)
          componentsMap = result.componentsMap
          workspaceButtons = result.workspaceButtons
          currentVolumeDisplay = result.volumeDisplay
          currentMediaDisplay = result.mediaDisplay
          currentNotificationDisplay = result.notificationDisplay
          const updatedPhysicalButtonConfigs: Map<number, Button> =
            result.physicalButtonConfigs as Map<number, Button>

          // 物理ボタンのLED色を更新
          const config = loadConfig()
          const ledColors = extractLedColors(config)
          await loupedeckDevice.setButtonColors(ledColors)
          logger.info('✓ 物理ボタンのLED色を更新しました')

          // ハンドラーを再作成
          volumeHandler = new VolumeHandler(
            volumeControl,
            currentVolumeDisplay!,
            currentLayout,
            vibration
          )
          pageHandler = new PageHandler(currentLayout, workspaceButtons, vibration)
          physicalButtonHandler = new PhysicalButtonHandler(
            appLauncher,
            currentLayout,
            workspaceButtons,
            vibration,
            updatedPhysicalButtonConfigs as Map<number, Button>
          )

          // メディアアイコン更新を再開
          mediaIconUpdateInterval = setInterval(updateMediaIcon, 2000)

          if (currentNotificationDisplay) {
            currentNotificationHandler = new NotificationHandler(
              notificationListener,
              currentNotificationDisplay,
              currentLayout
            )
            await currentNotificationHandler.start()
          }

          logger.info('✓ 設定の再読み込みが完了しました')
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          logger.error(`✗ 設定の再読み込みに失敗しました: ${message}`)
        }
      })
    }

    // 切断・再接続コールバックを登録
    loupedeckDevice.onDeviceDisconnect(async () => {
      logger.info('デバイス切断: デバイス依存状態をクリーンアップ中...')
      await teardownDeviceState()
    })

    loupedeckDevice.onDeviceReconnect(async () => {
      logger.info('デバイス再接続: デバイス依存状態を再構築中...')
      await setupDeviceState(true)
    })

    // デバイス依存状態を初期化
    await setupDeviceState(false)

    // 終了処理のセットアップ
    loupedeckDevice.setupExitHandlers(async () => {
      await teardownDeviceState()
      if (apiServer) await apiServer.stop()
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

    process.exit(1)
  }
}

// アプリケーション起動
main()
