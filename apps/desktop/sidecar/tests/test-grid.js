import { discover } from 'loupedeck'

console.log('Loupedeck デバイスを検索中...')

try {
  const device = await discover()
  console.log('✓ デバイスが見つかりました!')
  console.log(`  タイプ: ${device.type}`)
  console.log(
    `  グリッドサイズ: ${device.columns}列 x ${device.rows}行 = ${device.columns * device.rows}セル`
  )
  console.log('\nすべてのセルに位置情報を表示します...')
  console.log('どのセルが画面に表示されるか確認してください\n')

  // すべてのセルに位置情報を描画
  for (let row = 0; row < device.rows; row++) {
    for (let col = 0; col < device.columns; col++) {
      const keyId = row * device.columns + col

      // 各セルに番号と位置を描画
      await device.drawKey(keyId, (ctx) => {
        const width = ctx.canvas.width
        const height = ctx.canvas.height

        // 背景色を交互に変える（チェッカーボード）
        ctx.fillStyle = (row + col) % 2 === 0 ? '#2a4a6a' : '#3a5a7a'
        ctx.fillRect(0, 0, width, height)

        // キーIDを大きく表示
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 32px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(keyId), width / 2, height / 2 - 10)

        // 位置情報を小さく表示
        ctx.font = '14px sans-serif'
        ctx.fillStyle = '#AACCFF'
        ctx.fillText(`(${col},${row})`, width / 2, height / 2 + 20)
      })

      console.log(`セル [${keyId}] (列${col}, 行${row}) を描画`)
    }
  }

  console.log('\n描画完了！デバイスの画面を確認してください')
  console.log('10秒後に終了します...\n')

  // タッチイベント
  device.on('down', ({ id }) => {
    const touchedCol = id % device.columns
    const touchedRow = Math.floor(id / device.columns)
    console.log(`✓ セル [${id}] (列${touchedCol}, 行${touchedRow}) がタッチされました`)
  })

  setTimeout(() => {
    console.log('終了します')
    process.exit(0)
  }, 10000)
} catch (error) {
  console.error('✗ エラーが発生しました:', error.message)
  console.error(error.stack)
  process.exit(1)
}
