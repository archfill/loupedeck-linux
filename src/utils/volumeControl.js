import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from './logger.js'

const execAsync = promisify(exec)

/**
 * オーディオバックエンドの種類
 */
const AudioBackend = {
  PIPEWIRE: 'pipewire',
  PULSEAUDIO: 'pulseaudio',
  UNKNOWN: 'unknown',
}

/**
 * 音量制御ユーティリティクラス
 * PipeWire (wpctl) を優先的に使用し、フォールバックとしてPulseAudio (pactl) をサポート
 */
export class VolumeControl {
  constructor() {
    this.backend = AudioBackend.UNKNOWN
    this.currentVolume = 100 // パーセント単位
    this.isMuted = false
    this.initialized = false
  }

  /**
   * 利用可能なオーディオバックエンドを検出
   * @returns {Promise<string>} バックエンドの種類
   */
  async detectBackend() {
    if (this.backend !== AudioBackend.UNKNOWN) {
      return this.backend
    }

    try {
      // PipeWireを確認
      await execAsync('command -v wpctl')
      this.backend = AudioBackend.PIPEWIRE
      logger.info('オーディオバックエンド: PipeWire (wpctl)')
      return this.backend
    } catch {
      // PipeWireが利用できない場合、PulseAudioを確認
      try {
        await execAsync('command -v pactl')
        this.backend = AudioBackend.PULSEAUDIO
        logger.info('オーディオバックエンド: PulseAudio (pactl)')
        return this.backend
      } catch {
        this.backend = AudioBackend.UNKNOWN
        logger.error('利用可能なオーディオバックエンドが見つかりませんでした')
        return this.backend
      }
    }
  }

  /**
   * 初期化（バックエンド検出と現在の音量取得）
   * @returns {Promise<boolean>} 初期化成功
   */
  async initialize() {
    if (this.initialized) {
      return true
    }

    await this.detectBackend()

    if (this.backend === AudioBackend.UNKNOWN) {
      logger.error('音量制御を初期化できませんでした')
      return false
    }

    // 現在の音量を取得
    await this.getVolume()
    this.initialized = true
    logger.debug(`音量制御を初期化しました（現在: ${this.currentVolume}%）`)
    return true
  }

  /**
   * 現在の音量を取得
   * @returns {Promise<number>} 音量（0-100のパーセント値）
   */
  async getVolume() {
    try {
      if (this.backend === AudioBackend.PIPEWIRE) {
        return await this._getVolumePipeWire()
      } else if (this.backend === AudioBackend.PULSEAUDIO) {
        return await this._getVolumePulseAudio()
      }
      return this.currentVolume
    } catch (error) {
      logger.error(`音量取得エラー: ${error.message}`)
      return this.currentVolume
    }
  }

  /**
   * PipeWireから音量を取得
   * @private
   */
  async _getVolumePipeWire() {
    const { stdout } = await execAsync('wpctl get-volume @DEFAULT_AUDIO_SINK@')
    // 出力例: "Volume: 0.50" または "Volume: 0.50 [MUTED]"
    const match = stdout.match(/Volume:\s+([\d.]+)/)
    if (match) {
      const volume = Math.round(parseFloat(match[1]) * 100)
      this.currentVolume = volume
      this.isMuted = stdout.includes('[MUTED]')
      logger.debug(`音量取得（PipeWire）: ${volume}%${this.isMuted ? ' (ミュート)' : ''}`)
      return volume
    }
    return this.currentVolume
  }

  /**
   * PulseAudioから音量を取得
   * @private
   */
  async _getVolumePulseAudio() {
    const { stdout } = await execAsync('pactl get-sink-volume @DEFAULT_SINK@')
    // 出力例: "Volume: front-left: 32768 /  50% / -18.06 dB,   front-right: 32768 /  50% / -18.06 dB"
    const match = stdout.match(/(\d+)%/)
    if (match) {
      const volume = parseInt(match[1], 10)
      this.currentVolume = volume
      logger.debug(`音量取得（PulseAudio）: ${volume}%`)
      return volume
    }
    return this.currentVolume
  }

  /**
   * 音量を設定
   * @param {number} volume - 音量（0-100のパーセント値）
   * @returns {Promise<boolean>} 成功したか
   */
  async setVolume(volume) {
    // 0-100の範囲に制限
    const clampedVolume = Math.max(0, Math.min(100, Math.round(volume)))

    try {
      if (this.backend === AudioBackend.PIPEWIRE) {
        await this._setVolumePipeWire(clampedVolume)
      } else if (this.backend === AudioBackend.PULSEAUDIO) {
        await this._setVolumePulseAudio(clampedVolume)
      } else {
        return false
      }

      this.currentVolume = clampedVolume
      logger.debug(`音量設定: ${clampedVolume}%`)
      return true
    } catch (error) {
      logger.error(`音量設定エラー: ${error.message}`)
      return false
    }
  }

  /**
   * PipeWireで音量を設定
   * @private
   */
  async _setVolumePipeWire(volume) {
    const volumeDecimal = (volume / 100).toFixed(2)
    await execAsync(`wpctl set-volume @DEFAULT_AUDIO_SINK@ ${volumeDecimal}`)
  }

  /**
   * PulseAudioで音量を設定
   * @private
   */
  async _setVolumePulseAudio(volume) {
    await execAsync(`pactl set-sink-volume @DEFAULT_SINK@ ${volume}%`)
  }

  /**
   * 音量を相対的に変更
   * @param {number} delta - 変更量（正の値で増加、負の値で減少）
   * @returns {Promise<number>} 新しい音量
   */
  async adjustVolume(delta) {
    const newVolume = this.currentVolume + delta
    await this.setVolume(newVolume)
    return this.currentVolume
  }

  /**
   * 音量を増やす
   * @param {number} step - 増やす量（デフォルト: 5）
   * @returns {Promise<number>} 新しい音量
   */
  async increaseVolume(step = 5) {
    return await this.adjustVolume(step)
  }

  /**
   * 音量を減らす
   * @param {number} step - 減らす量（デフォルト: 5）
   * @returns {Promise<number>} 新しい音量
   */
  async decreaseVolume(step = 5) {
    return await this.adjustVolume(-step)
  }

  /**
   * ミュート/ミュート解除をトグル
   * @returns {Promise<boolean>} ミュート状態
   */
  async toggleMute() {
    try {
      if (this.backend === AudioBackend.PIPEWIRE) {
        await execAsync('wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle')
      } else if (this.backend === AudioBackend.PULSEAUDIO) {
        await execAsync('pactl set-sink-mute @DEFAULT_SINK@ toggle')
      } else {
        return this.isMuted
      }

      this.isMuted = !this.isMuted
      logger.info(`ミュート: ${this.isMuted ? 'ON' : 'OFF'}`)
      return this.isMuted
    } catch (error) {
      logger.error(`ミュート切り替えエラー: ${error.message}`)
      return this.isMuted
    }
  }

  /**
   * 現在の音量を取得（キャッシュ値）
   * @returns {number} 音量（0-100）
   */
  getCurrentVolume() {
    return this.currentVolume
  }

  /**
   * ミュート状態を取得
   * @returns {boolean} ミュート中かどうか
   */
  getIsMuted() {
    return this.isMuted
  }
}

export default VolumeControl
