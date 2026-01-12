import { existsSync } from 'fs'
import { logger } from './logger.ts'

/**
 * アイコン解決ユーティリティ
 * アプリ名から自動的にシステムアイコンのパスを探す
 */
export class IconResolver {
  private static cache = new Map<string, string | null>()

  /**
   * フォールバック用のアプリ名候補を生成
   *
   * コマンド名とアイコン名が異なるケース（google-chrome-stable → google-chrome）に対応
   *
   * @param appName - 元のアプリ名
   * @returns フォールバック候補のリスト
   */
  private static generateFallbackNames(appName: string): string[] {
    const fallbacks: string[] = []

    // 一般的なバージョンサフィックスを削除
    const suffixes = [
      '-stable',
      '-beta',
      '-devel',
      '-devedition',
      '-snapshot',
      '-canary',
      '-nightly',
      '-latest',
      '-git',
    ]

    for (const suffix of suffixes) {
      if (appName.endsWith(suffix)) {
        const baseName = appName.slice(0, -suffix.length)
        fallbacks.push(baseName)
        break // 1つのサフィックスのみ削除
      }
    }

    // -oss サフィックスの処理（例: code-oss → code）
    if (appName.endsWith('-oss')) {
      fallbacks.push(appName.slice(0, -4))
    }

    return fallbacks
  }

  /**
   * 指定されたアプリ名に対する検索パスのリストを生成
   * @param appName - アプリケーション名
   * @param preferredSize - 優先サイズ
   * @returns 検索パスの配列
   */
  private static getSearchPaths(appName: string, preferredSize: number): string[] {
    return [
      // hicolor テーマ（優先サイズ）
      `/usr/share/icons/hicolor/${preferredSize}x${preferredSize}/apps/${appName}.png`,
      // hicolor テーマ（代替サイズ）
      `/usr/share/icons/hicolor/64x64/apps/${appName}.png`,
      `/usr/share/icons/hicolor/48x48/apps/${appName}.png`,
      `/usr/share/icons/hicolor/128x128/apps/${appName}.png`,
      `/usr/share/icons/hicolor/256x256/apps/${appName}.png`,
      // Papirus テーマ
      `/usr/share/icons/Papirus/64x64/apps/${appName}.svg`,
      `/usr/share/icons/Papirus/48x48/apps/${appName}.svg`,
      // pixmaps（古い形式）
      `/usr/share/pixmaps/${appName}.png`,
      `/usr/share/pixmaps/${appName}.svg`,
      // AppImage 形式
      `/usr/share/icons/hicolor/64x64/apps/appimagekit-${appName}.png`,
      `/usr/share/icons/Papirus/64x64/apps/appimagekit-${appName}.svg`,
    ]
  }

  /**
   * 単一のアプリ名でアイコンを検索（キャッシュなし）
   * @param appName - アプリケーション名
   * @param preferredSize - 優先サイズ
   * @returns アイコンパス、または見つからない場合はnull
   */
  private static searchIcon(appName: string, preferredSize: number): string | null {
    const searchPaths = this.getSearchPaths(appName, preferredSize)

    for (const iconPath of searchPaths) {
      if (existsSync(iconPath)) {
        logger.debug(`IconResolver: ${appName} のアイコンが見つかりました: ${iconPath}`)
        return iconPath
      }
    }

    return null
  }

  /**
   * アプリ名からアイコンパスを解決（フォールバック対応）
   * @param appName - アプリケーション名（例: 'firefox', 'google-chrome-stable'）
   * @param preferredSize - 優先サイズ（デフォルト: 64）
   * @returns アイコンパス、または見つからない場合はnull
   */
  static resolve(appName: string, preferredSize: number = 64): string | null {
    // キャッシュをチェック
    const cacheKey = `${appName}-${preferredSize}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) || null
    }

    // まず正確な appName で検索
    let iconPath = this.searchIcon(appName, preferredSize)

    // 見つからなかった場合、フォールバック名を試行
    if (!iconPath) {
      const fallbacks = this.generateFallbackNames(appName)
      for (const fallbackName of fallbacks) {
        logger.debug(`IconResolver: フォールバックを試行: ${fallbackName} (元: ${appName})`)
        iconPath = this.searchIcon(fallbackName, preferredSize)
        if (iconPath) {
          logger.info(
            `IconResolver: フォールバックでアイコンが見つかりました: ${fallbackName} → ${appName}`
          )
          break
        }
      }
    }

    // 結果をキャッシュ
    if (iconPath) {
      this.cache.set(cacheKey, iconPath)
      return iconPath
    }

    // 見つからなかった場合
    logger.warn(`IconResolver: ${appName} のアイコンが見つかりませんでした（フォールバック含む）`)
    this.cache.set(cacheKey, null)
    return null
  }

  /**
   * 複数のアプリ名を試してアイコンを解決
   * @param appNames - アプリ名の候補リスト
   * @param preferredSize - 優先サイズ（デフォルト: 64）
   * @returns アイコンパス、または見つからない場合はnull
   */
  static resolveMultiple(appNames: string[], preferredSize: number = 64): string | null {
    for (const appName of appNames) {
      const iconPath = this.resolve(appName, preferredSize)
      if (iconPath) {
        return iconPath
      }
    }
    return null
  }

  /**
   * キャッシュをクリア
   */
  static clearCache(): void {
    this.cache.clear()
    logger.debug('IconResolver: キャッシュをクリアしました')
  }

  /**
   * キャッシュの状態を取得（デバッグ用）
   * @returns キャッシュの内容
   */
  static getCacheStatus(): { size: number; entries: [string, string | null][] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()),
    }
  }
}
