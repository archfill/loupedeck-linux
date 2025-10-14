import { discover } from 'loupedeck'

console.log('Loupedeck デバイスを検索中...')

try {
  const device = await discover()
  console.log('✓ デバイスが見つかりました!')
  console.log(`  タイプ: ${device.type}`)
  console.log(`  グリッドサイズ: ${device.columns}列 x ${device.rows}行\n`)
  console.log('各キーIDをゆっくり順番にテストします...\n')

  // キーIDを1つずつテスト
  for (let keyId = 0; keyId < device.columns * device.rows; keyId++) {
    const col = keyId % device.columns
    const row = Math.floor(keyId / device.columns)

    console.log(`[${keyId}] (列${col}, 行${row}) を描画中...`)

    try {
      await device.drawKey(keyId, (ctx) => {
        const width = ctx.canvas.width
        const height = ctx.canvas.height

        // 背景色を緑に
        ctx.fillStyle = '#00AA00'
        ctx.fillRect(0, 0, width, height)

        // キーIDを大きく表示
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 36px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(keyId), width / 2, height / 2)

        console.log(`  ✓ キー${keyId}の描画コマンド送信完了 (${width}x${height}px)`)
      })
    } catch (error) {
      console.log(`  ✗ キー${keyId}の描画失敗:`, error.message)
    }

    // 各描画の間に1秒待機
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  console.log('\nすべてのキーのテスト完了！')
  console.log('どのキーIDが画面に表示されたか確認してください')
  console.log('15秒後に終了します...\n')

  // タッチイベント
  device.on('down', ({ id }) => {
    const touchedCol = id % device.columns
    const touchedRow = Math.floor(id / device.columns)
    console.log(`★ キー [${id}] (列${touchedCol}, 行${touchedRow}) がタッチされました`)
  })

  setTimeout(() => {
    console.log('終了します')
    process.exit(0)
  }, 15000)
} catch (error) {
  console.error('✗ エラーが発生しました:', error.message)
  console.error(error.stack)
  process.exit(1)
}
