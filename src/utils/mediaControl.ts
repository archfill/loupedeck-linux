import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from './logger.ts'

const execAsync = promisify(exec)

/**
 * メディアメタデータ
 */
export interface MediaMetadata {
  title: string
  artist: string
  album: string
  status: 'Playing' | 'Paused' | 'Stopped'
}

/**
 * メディアコントロールユーティリティ
 * playerctlを使用してメディアプレーヤーを制御
 */
export class MediaControl {
  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    try {
      // playerctlが利用可能か確認
      await execAsync('which playerctl')
      logger.info('✓ MediaControl: playerctlが見つかりました')
    } catch {
      logger.warn('⚠ MediaControl: playerctlが見つかりません')
      throw new Error('playerctlがインストールされていません')
    }
  }

  /**
   * 再生/一時停止を切り替え
   * @returns 現在の状態（'Playing' または 'Paused'）
   */
  async togglePlayPause(): Promise<'Playing' | 'Paused' | 'Stopped'> {
    try {
      await execAsync('playerctl play-pause')
      const status = await this.getStatus()
      logger.info(`メディア: ${status === 'Playing' ? '再生' : '一時停止'}`)
      return status
    } catch {
      logger.warn('メディアプレーヤーが見つかりません')
      return 'Stopped'
    }
  }

  /**
   * 次のトラックへ
   */
  async next(): Promise<void> {
    try {
      await execAsync('playerctl next')
      logger.info('メディア: 次のトラック')
    } catch {
      logger.warn('メディアプレーヤーが見つかりません')
    }
  }

  /**
   * 前のトラックへ
   */
  async previous(): Promise<void> {
    try {
      await execAsync('playerctl previous')
      logger.info('メディア: 前のトラック')
    } catch {
      logger.warn('メディアプレーヤーが見つかりません')
    }
  }

  /**
   * 現在の再生状態を取得
   * @returns 'Playing', 'Paused', 'Stopped'
   */
  async getStatus(): Promise<'Playing' | 'Paused' | 'Stopped'> {
    try {
      const { stdout } = await execAsync('playerctl status')
      const status = stdout.trim()
      if (status === 'Playing' || status === 'Paused') {
        return status
      }
      return 'Stopped'
    } catch {
      return 'Stopped'
    }
  }

  /**
   * 現在のメディア情報を取得
   * @returns { title, artist, album, status }
   */
  async getMetadata(): Promise<MediaMetadata> {
    try {
      const [title, artist, album, status] = await Promise.all([
        execAsync('playerctl metadata title').then((r) => r.stdout.trim()),
        execAsync('playerctl metadata artist').then((r) => r.stdout.trim()),
        execAsync('playerctl metadata album').then((r) => r.stdout.trim()),
        this.getStatus(),
      ])

      return {
        title: title || '不明',
        artist: artist || '不明',
        album: album || '',
        status,
      }
    } catch {
      return {
        title: 'メディアなし',
        artist: '',
        album: '',
        status: 'Stopped',
      }
    }
  }
}
