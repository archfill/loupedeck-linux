import { discover } from 'loupedeck'

console.log('Loupedeck デバイスを検索中...')

try {
  const device = await discover()
  console.log('✓ デバイスが見つかりました!')

  // デバイス情報を表示
  console.log('\nデバイス情報:')
  console.log(`  タイプ: ${device.type}`)
  console.log(`  ボタン数: ${device.buttons}`)
  console.log(`  ノブ数: ${device.knobs}`)
  console.log(`  カラム数: ${device.columns}`)
  console.log(`  行数: ${device.rows}`)
  console.log(`  ディスプレイ数: ${device.displays?.length || 0}`)
  console.log('\nイベントをリッスンしています...')
  console.log('(Ctrl+C で終了)\n')

  // ボタン押下イベント
  device.on('down', ({ id }) => {
    console.log(`🔽 ボタン押下: ${id}`)
  })

  // ボタン解放イベント
  device.on('up', ({ id }) => {
    console.log(`🔼 ボタン解放: ${id}`)
  })

  // ノブ回転イベント
  device.on('rotate', ({ id, delta }) => {
    console.log(`🔄 ノブ ${id} 回転: ${delta}`)
  })

  // タッチイベント
  device.on('touchstart', ({ changedTouches }) => {
    console.log(`👆 タッチ開始:`, changedTouches)
  })

  device.on('touchmove', ({ changedTouches }) => {
    console.log(`👉 タッチ移動:`, changedTouches)
  })

  device.on('touchend', ({ changedTouches }) => {
    console.log(`👋 タッチ終了:`, changedTouches)
  })

  // 接続イベント
  device.on('connect', () => {
    console.log('✓ デバイスが接続されました')
  })

  // 切断イベント
  device.on('disconnect', () => {
    console.log('✗ デバイスが切断されました')
    process.exit(0)
  })
} catch (error) {
  console.error('✗ エラーが発生しました:', error.message)
  console.error('\nトラブルシューティング:')
  console.error('1. デバイスが接続されているか確認してください')
  console.error('2. udevルールが正しく適用されているか確認してください')
  console.error('3. 公式Loupedeckソフトウェアが動作していないか確認してください')
  process.exit(1)
}
