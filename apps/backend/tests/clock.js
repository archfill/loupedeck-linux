import { discover } from 'loupedeck'

console.log('Loupedeck デバイスを検索中...')

try {
  const device = await discover()
  console.log('✓ デバイスが見つかりました!')
  console.log(`  タイプ: ${device.type}`)
  console.log('\n日付・時刻を表示しています...')
  console.log('(Ctrl+C で終了)\n')

  // 日付・時刻を描画する関数
  const drawDateTime = async () => {
    const now = new Date()

    // 日本語での日付フォーマット
    const dateStr = now.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })

    // 時刻フォーマット
    const timeStr = now.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    // 中央の画面に描画（Live Sの場合、x: 60, y: 270のサイズ）
    await device.drawScreen('center', (ctx) => {
      // 背景を黒に設定
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

      // 時刻を大きく表示
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 32px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(timeStr, ctx.canvas.width / 2, ctx.canvas.height / 2 - 30)

      // 日付を小さく表示
      ctx.font = '16px sans-serif'
      ctx.fillStyle = '#AAAAAA'
      ctx.fillText(dateStr, ctx.canvas.width / 2, ctx.canvas.height / 2 + 20)
    })
  }

  // 初回描画
  await drawDateTime()

  // 1秒ごとに更新
  const intervalId = setInterval(async () => {
    try {
      await drawDateTime()
    } catch (error) {
      console.error('描画エラー:', error.message)
      clearInterval(intervalId)
      process.exit(1)
    }
  }, 1000)

  // 接続イベント
  device.on('connect', () => {
    console.log('✓ デバイスが接続されました')
  })

  // 切断イベント
  device.on('disconnect', () => {
    console.log('✗ デバイスが切断されました')
    clearInterval(intervalId)
    process.exit(0)
  })

  // Ctrl+Cで終了
  process.on('SIGINT', () => {
    console.log('\n終了しています...')
    clearInterval(intervalId)
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
