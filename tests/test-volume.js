import { VolumeControl } from '../src/utils/volumeControl.js'

/**
 * 音量制御のテストスクリプト
 */
async function testVolumeControl() {
  console.log('=== 音量制御テスト ===\n')

  const volumeControl = new VolumeControl()

  // 初期化
  console.log('1. 音量制御を初期化中...')
  const initialized = await volumeControl.initialize()
  if (!initialized) {
    console.error('✗ 初期化に失敗しました')
    process.exit(1)
  }
  console.log('✓ 初期化成功\n')

  // 現在の音量を取得
  console.log('2. 現在の音量を取得中...')
  const currentVolume = await volumeControl.getVolume()
  console.log(`✓ 現在の音量: ${currentVolume}%\n`)

  // 音量を50%に設定
  console.log('3. 音量を50%に設定...')
  await volumeControl.setVolume(50)
  const newVolume = await volumeControl.getVolume()
  console.log(`✓ 新しい音量: ${newVolume}%\n`)

  // 音量を5%増やす
  console.log('4. 音量を5%増やす...')
  await volumeControl.increaseVolume(5)
  const increasedVolume = await volumeControl.getVolume()
  console.log(`✓ 増加後の音量: ${increasedVolume}%\n`)

  // 音量を5%減らす
  console.log('5. 音量を5%減らす...')
  await volumeControl.decreaseVolume(5)
  const decreasedVolume = await volumeControl.getVolume()
  console.log(`✓ 減少後の音量: ${decreasedVolume}%\n`)

  // 元の音量に戻す
  console.log('6. 元の音量に戻す...')
  await volumeControl.setVolume(currentVolume)
  const restoredVolume = await volumeControl.getVolume()
  console.log(`✓ 音量を復元: ${restoredVolume}%\n`)

  console.log('=== すべてのテストが完了しました ===')
}

// テスト実行
testVolumeControl().catch((error) => {
  console.error('✗ テスト中にエラーが発生しました:', error.message)
  process.exit(1)
})
