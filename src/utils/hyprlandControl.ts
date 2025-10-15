import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from './logger.ts'

const execAsync = promisify(exec)

/**
 * Hyprlandの制御クラス
 * hyprctlコマンドを使用してワークスペースやウィンドウを操作
 */
export class HyprlandControl {
  private isHyprland: boolean

  constructor() {
    this.isHyprland = false
  }

  /**
   * Hyprlandが動作しているか初期化時にチェック
   */
  async initialize(): Promise<void> {
    try {
      const { stdout } = await execAsync('hyprctl version')
      this.isHyprland = stdout.includes('Hyprland')
      if (this.isHyprland) {
        logger.info('✓ Hyprlandが検出されました')
      } else {
        logger.warn('Hyprlandが検出されませんでした')
      }
    } catch (error) {
      this.isHyprland = false
      logger.warn('Hyprlandが検出されませんでした（hyprctlコマンドが見つかりません）')
    }
  }

  /**
   * Hyprlandが利用可能かチェック
   */
  isAvailable(): boolean {
    return this.isHyprland
  }

  /**
   * 指定したワークスペースに切り替え
   * @param id - ワークスペース番号
   */
  async switchWorkspace(id: number): Promise<void> {
    if (!this.isHyprland) {
      logger.warn('Hyprlandが利用できません')
      return
    }

    try {
      await execAsync(`hyprctl dispatch workspace ${id}`)
      logger.info(`Switched to workspace ${id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to switch workspace: ${message}`)
      throw error
    }
  }

  /**
   * アクティブウィンドウを指定したワークスペースに移動
   * @param id - ワークスペース番号
   */
  async moveToWorkspace(id: number): Promise<void> {
    if (!this.isHyprland) {
      logger.warn('Hyprlandが利用できません')
      return
    }

    try {
      await execAsync(`hyprctl dispatch movetoworkspace ${id}`)
      logger.info(`Moved active window to workspace ${id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to move window: ${message}`)
      throw error
    }
  }

  /**
   * 現在のワークスペース番号を取得
   * @returns ワークスペース番号
   */
  async getCurrentWorkspace(): Promise<number> {
    if (!this.isHyprland) {
      logger.warn('Hyprlandが利用できません')
      return -1
    }

    try {
      const { stdout } = await execAsync('hyprctl activeworkspace -j')
      const workspace = JSON.parse(stdout)
      return workspace.id
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to get current workspace: ${message}`)
      return -1
    }
  }

  /**
   * フローティングウィンドウの切り替え
   */
  async toggleFloat(): Promise<void> {
    if (!this.isHyprland) {
      logger.warn('Hyprlandが利用できません')
      return
    }

    try {
      await execAsync('hyprctl dispatch togglefloating')
      logger.info('Toggled floating window')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to toggle floating: ${message}`)
      throw error
    }
  }

  /**
   * フルスクリーンの切り替え
   */
  async toggleFullscreen(): Promise<void> {
    if (!this.isHyprland) {
      logger.warn('Hyprlandが利用できません')
      return
    }

    try {
      await execAsync('hyprctl dispatch fullscreen')
      logger.info('Toggled fullscreen')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to toggle fullscreen: ${message}`)
      throw error
    }
  }

  /**
   * アクティブウィンドウを指定したモニターに移動
   * @param monitor - モニター名またはID
   */
  async moveToMonitor(monitor: string): Promise<void> {
    if (!this.isHyprland) {
      logger.warn('Hyprlandが利用できません')
      return
    }

    try {
      await execAsync(`hyprctl dispatch movecurrentworkspacetomonitor ${monitor}`)
      logger.info(`Moved workspace to monitor ${monitor}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to move to monitor: ${message}`)
      throw error
    }
  }

  /**
   * スペシャルワークスペース（スクラッチパッド）の切り替え
   * @param name - スペシャルワークスペース名（省略可）
   */
  async toggleSpecialWorkspace(name?: string): Promise<void> {
    if (!this.isHyprland) {
      logger.warn('Hyprlandが利用できません')
      return
    }

    try {
      const command = name
        ? `hyprctl dispatch togglespecialworkspace ${name}`
        : 'hyprctl dispatch togglespecialworkspace'
      await execAsync(command)
      logger.info(`Toggled special workspace${name ? ` ${name}` : ''}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to toggle special workspace: ${message}`)
      throw error
    }
  }

  /**
   * 任意のhyprctlコマンドを実行
   * @param command - 実行するコマンド（"dispatch" 以降の部分）
   */
  async dispatchCommand(command: string): Promise<void> {
    if (!this.isHyprland) {
      logger.warn('Hyprlandが利用できません')
      return
    }

    try {
      await execAsync(`hyprctl dispatch ${command}`)
      logger.info(`Executed command: ${command}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to execute command: ${message}`)
      throw error
    }
  }
}
