import { existsSync } from 'fs'
import { logger } from './logger.ts'

/**
 * アイコン解決ユーティリティ
 * アプリ名から自動的にシステムアイコンのパスを探す
 */
export class IconResolver {
  private static cache = new Map<string, string | null>()

  /**
   * アプリ名からアイコンパスを解決
   * @param appName - アプリケーション名（例: 'firefox', '1password'）
   * @param preferredSize - 優先サイズ（デフォルト: 64）
   * @returns アイコンパス、または見つからない場合はnull
   */
  static resolve(appName: string, preferredSize: number = 64): string | null {
    // キャッシュをチェック
    const cacheKey = `${appName}-${preferredSize}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) || null
    }

    // 検索パスのリスト（優先順位順）
    const searchPaths = [
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

    // 各パスを順番にチェック
    for (const iconPath of searchPaths) {
      if (existsSync(iconPath)) {
        logger.debug(`IconResolver: ${appName} のアイコンが見つかりました: ${iconPath}`)
        this.cache.set(cacheKey, iconPath)
        return iconPath
      }
    }

    // 見つからなかった場合
    logger.warn(`IconResolver: ${appName} のアイコンが見つかりませんでした`)
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
