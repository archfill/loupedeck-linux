import { discover } from 'loupedeck'

console.log('Loupedeck デバイスを検索中...')

try {
  const device = await discover()
  console.log('✓ デバイスが見つかりました!')
  console.log('\nデバイスの詳細情報:')
  console.log('  type:', device.type)
  console.log('  buttons:', device.buttons)
  console.log('  knobs:', device.knobs)
  console.log('  displays:', device.displays)
  console.log('  columns:', device.columns)
  console.log('  rows:', device.rows)
  console.log('  keySize:', device.keySize)

  console.log('\n利用可能なメソッドをテスト中...\n')

  // 画面全体への描画テスト
  console.log('1. 画面全体への描画をテスト (drawScreen)...')
  try {
    await device.drawScreen('center', (ctx) => {
      ctx.fillStyle = '#FF0000'
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('TEST', ctx.canvas.width / 2, ctx.canvas.height / 2)
    })
    console.log('   ✓ drawScreen成功')
  } catch (error) {
    console.log('   ✗ drawScreen失敗:', error.message)
  }

  await new Promise((resolve) => setTimeout(resolve, 2000))

  // ボタンへの描画テスト
  console.log('\n2. ボタン0への描画をテスト (drawKey)...')
  try {
    await device.drawKey(0, (ctx) => {
      ctx.fillStyle = '#00FF00'
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      ctx.fillStyle = '#000000'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('BTN0', ctx.canvas.width / 2, ctx.canvas.height / 2)
      console.log('   canvas size:', ctx.canvas.width, 'x', ctx.canvas.height)
    })
    console.log('   ✓ drawKey成功')
  } catch (error) {
    console.log('   ✗ drawKey失敗:', error.message)
  }

  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 座標指定での描画テスト
  console.log('\n3. 座標指定での描画をテスト (drawScreen with coordinates)...')
  try {
    await device.drawScreen({ x: 0, y: 0, width: 90, height: 90 }, (ctx) => {
      ctx.fillStyle = '#0000FF'
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('XY', ctx.canvas.width / 2, ctx.canvas.height / 2)
      console.log('   canvas size:', ctx.canvas.width, 'x', ctx.canvas.height)
    })
    console.log('   ✓ 座標指定描画成功')
  } catch (error) {
    console.log('   ✗ 座標指定描画失敗:', error.message)
  }

  console.log('\n5秒後に終了します...')
  setTimeout(() => {
    process.exit(0)
  }, 5000)
} catch (error) {
  console.error('✗ エラーが発生しました:', error.message)
  console.error(error.stack)
  process.exit(1)
}
