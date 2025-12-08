/**
 * ページ構成の定義
 *
 * このファイルは config/config.json から設定を読み込んでエクスポートします。
 * 新しいボタンやコンポーネントを追加する場合は、
 * config/config.json を編集してください。
 */

import { loadConfig, convertToPageConfig } from './configLoader.ts'
import type { Component, PageMeta } from './configLoader.ts'

/**
 * ページ構成
 */
export interface PageConfig {
  meta: PageMeta
  components: Record<string, Component>
}

/**
 * 全ページの設定（JSONから読み込み）
 */
export const pagesConfig: Record<number, PageConfig> = convertToPageConfig(loadConfig())
