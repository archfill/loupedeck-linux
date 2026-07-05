import { discover } from 'loupedeck'

console.log('Loupedeck デバイスを検索中...')

try {
  const device = await discover()
  console.log('✓ デバイスが見つかりました!\n')

  // デバイス情報を表示
  console.log('デバイス情報:')
  console.log(`  タイプ: ${device.type}`)
  console.log(`  ボタン数: ${device.buttons?.length || 0}`)
  console.log(`  ノブ数: ${device.knobs?.length || 0}`)
  console.log(`  カラム数: ${device.columns}`)
  console.log(`  行数: ${device.rows}`)

  // ノブの詳細情報
  if (device.knobs && device.knobs.length > 0) {
    console.log('\nノブの詳細:')
    device.knobs.forEach((knob, index) => {
      console.log(`  ノブ ${index}: ${JSON.stringify(knob)}`)
    })
  } else {
    console.log('\n⚠️ ノブが見つかりません')
  }

  console.log('\n🔄 ノブを回転させてイベントをテストしてください...')
  console.log('(Ctrl+C で終了)\n')

  // ノブ回転イベント
  device.on('rotate', ({ id, delta }) => {
    console.log(`🔄 ノブ回転イベント:`)
    console.log(`   ID: ${id}`)
    console.log(`   Delta: ${delta}`)
    console.log(`   方向: ${delta > 0 ? '時計回り（右）' : '反時計回り（左）'}`)
    console.log('')
  })

  // ボタン押下イベント（ノブ押下も含む）
  device.on('down', ({ id }) => {
    console.log(`🔽 ボタン押下: ${id}`)
  })

  device.on('up', ({ id }) => {
    console.log(`🔼 ボタン解放: ${id}`)
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
