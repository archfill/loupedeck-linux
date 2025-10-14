import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from './logger.ts'

const execAsync = promisify(exec)

/**
 * オーディオバックエンドの種類
 */
enum AudioBackend {
  PIPEWIRE = 'pipewire',
  PULSEAUDIO = 'pulseaudio',
  UNKNOWN = 'unknown',
}

/**
 * 音量制御ユーティリティクラス
 * PipeWire (wpctl) を優先的に使用し、フォールバックとしてPulseAudio (pactl) をサポート
 */
export class VolumeControl {
  private backend: AudioBackend
  private currentVolume: number
  private isMuted: boolean
  private initialized: boolean

  constructor() {
    this.backend = AudioBackend.UNKNOWN
    this.currentVolume = 100 // パーセント単位
    this.isMuted = false
    this.initialized = false
  }

  /**
   * 利用可能なオーディオバックエンドを検出
   * @returns バックエンドの種類
   */
  async detectBackend(): Promise<AudioBackend> {
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
   * @returns 初期化成功
   */
  async initialize(): Promise<boolean> {
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
   * @returns 音量（0-100のパーセント値）
   */
  async getVolume(): Promise<number> {
    try {
      if (this.backend === AudioBackend.PIPEWIRE) {
        return await this._getVolumePipeWire()
      } else if (this.backend === AudioBackend.PULSEAUDIO) {
        return await this._getVolumePulseAudio()
      }
      return this.currentVolume
    } catch (error: any) {
      logger.error(`音量取得エラー: ${error.message}`)
      return this.currentVolume
    }
  }

  /**
   * PipeWireから音量を取得
   * @private
   */
  private async _getVolumePipeWire(): Promise<number> {
    const { stdout } = await execAsync('wpctl get-volume @DEFAULT_AUDIO_SINK@')
    // 出力例: "Volume: 0.50" または "Volume: 0.50 [MUTED]"
    const match = stdout.match(/Volume:\s+([\d.]+)/)
    if (match && match[1]) {
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
  private async _getVolumePulseAudio(): Promise<number> {
    const { stdout } = await execAsync('pactl get-sink-volume @DEFAULT_SINK@')
    // 出力例: "Volume: front-left: 32768 /  50% / -18.06 dB,   front-right: 32768 /  50% / -18.06 dB"
    const match = stdout.match(/(\d+)%/)
    if (match && match[1]) {
      const volume = parseInt(match[1], 10)
      this.currentVolume = volume
      logger.debug(`音量取得（PulseAudio）: ${volume}%`)
      return volume
    }
    return this.currentVolume
  }

  /**
   * 音量を設定
   * @param volume - 音量（0-100のパーセント値）
   * @returns 成功したか
   */
  async setVolume(volume: number): Promise<boolean> {
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
    } catch (error: any) {
      logger.error(`音量設定エラー: ${error.message}`)
      return false
    }
  }

  /**
   * PipeWireで音量を設定
   * @private
   */
  private async _setVolumePipeWire(volume: number): Promise<void> {
    const volumeDecimal = (volume / 100).toFixed(2)
    await execAsync(`wpctl set-volume @DEFAULT_AUDIO_SINK@ ${volumeDecimal}`)
  }

  /**
   * PulseAudioで音量を設定
   * @private
   */
  private async _setVolumePulseAudio(volume: number): Promise<void> {
    await execAsync(`pactl set-sink-volume @DEFAULT_SINK@ ${volume}%`)
  }

  /**
   * 音量を相対的に変更
   * @param delta - 変更量（正の値で増加、負の値で減少）
   * @returns 新しい音量
   */
  async adjustVolume(delta: number): Promise<number> {
    const newVolume = this.currentVolume + delta
    await this.setVolume(newVolume)
    return this.currentVolume
  }

  /**
   * 音量を増やす
   * @param step - 増やす量（デフォルト: 5）
   * @returns 新しい音量
   */
  async increaseVolume(step: number = 5): Promise<number> {
    return await this.adjustVolume(step)
  }

  /**
   * 音量を減らす
   * @param step - 減らす量（デフォルト: 5）
   * @returns 新しい音量
   */
  async decreaseVolume(step: number = 5): Promise<number> {
    return await this.adjustVolume(-step)
  }

  /**
   * ミュート/ミュート解除をトグル
   * @returns ミュート状態
   */
  async toggleMute(): Promise<boolean> {
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
    } catch (error: any) {
      logger.error(`ミュート切り替えエラー: ${error.message}`)
      return this.isMuted
    }
  }

  /**
   * 現在の音量を取得（キャッシュ値）
   * @returns 音量（0-100）
   */
  getCurrentVolume(): number {
    return this.currentVolume
  }

  /**
   * ミュート状態を取得
   * @returns ミュート中かどうか
   */
  getIsMuted(): boolean {
    return this.isMuted
  }
}

export default VolumeControl
