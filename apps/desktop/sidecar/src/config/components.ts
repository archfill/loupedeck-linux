import { VIBRATION_PATTERNS, type VibrationPattern } from './constants.js'

/**
 * コンポーネント設定
 * 各コンポーネントの位置とオプションを定義
 */

// ========================================
// 型定義
// ========================================

/** グリッド上の位置 */
export interface Position {
  col: number
  row: number
}

/** 時計コンポーネントのオプション */
export interface ClockOptions {
  cellBgColor: string
  cellBorderColor: string
  timeColor: string
  dateColor: string
  showSeconds: boolean
}

/** 時計コンポーネントの設定 */
export interface ClockConfig {
  position: Position
  options: ClockOptions
}

/** ボタンコンポーネントのオプション */
export interface ButtonOptions {
  label: string
  icon?: string // 絵文字やNerdFontのアイコン
  iconSize: number
  bgColor: string
  borderColor: string
  textColor: string
  hoverBgColor: string
  vibrationPattern: VibrationPattern
  maxLabelLength?: number // ラベルの最大文字数（デフォルト: 15）
}

/** ボタンコンポーネントの設定 */
export interface ButtonConfig {
  position: Position
  appName: string
  options: ButtonOptions
  command: string
}

/** 音量表示のオプション */
export interface VolumeDisplayOptions {
  cellBgColor: string
  cellBorderColor: string
  barFillColor: string
}

/** 音量表示の設定 */
export interface VolumeDisplayConfig {
  position: Position
  options: VolumeDisplayOptions
}

/** メディア表示のオプション */
export interface MediaDisplayOptions {
  cellBgColor: string
  cellBorderColor: string
  titleColor: string
  artistColor: string
  statusColor: string
  iconColor: string
}

/** メディア表示の設定 */
export interface MediaDisplayConfig {
  position: Position
  options: MediaDisplayOptions
}

// ========================================
// 設定値
// ========================================

/**
 * 時計コンポーネントの設定
 */
export const clockConfig: ClockConfig = {
  position: { col: 0, row: 0 },
  options: {
    cellBgColor: '#1a1a3e',
    cellBorderColor: '#4466AA',
    timeColor: '#FFFFFF',
    dateColor: '#88AAFF',
    showSeconds: true,
  },
}

/**
 * Firefoxボタンの設定
 */
export const firefoxButtonConfig: ButtonConfig = {
  position: { col: 1, row: 0 },
  appName: 'firefox', // IconResolverで自動解決
  options: {
    label: 'Firefox',
    iconSize: 48,
    bgColor: '#FF6611',
    borderColor: '#FF8833',
    textColor: '#FFFFFF',
    hoverBgColor: '#FF7722',
    vibrationPattern: VIBRATION_PATTERNS.TAP,
  },
  command: 'firefox',
}

/**
 * 1Passwordボタンの設定
 */
export const onePasswordButtonConfig: ButtonConfig = {
  position: { col: 2, row: 0 },
  appName: '1password', // IconResolverで自動解決
  options: {
    label: '1Password',
    iconSize: 48,
    bgColor: '#0094F5',
    borderColor: '#33AAFF',
    textColor: '#FFFFFF',
    hoverBgColor: '#1AA5FF',
    vibrationPattern: VIBRATION_PATTERNS.TAP,
  },
  command: '1password',
}

/**
 * Thunderbirdボタンの設定
 */
export const thunderbirdButtonConfig: ButtonConfig = {
  position: { col: 3, row: 0 },
  appName: 'thunderbird', // IconResolverで自動解決
  options: {
    label: 'Mail',
    iconSize: 48,
    bgColor: '#0A84FF',
    borderColor: '#3399FF',
    textColor: '#FFFFFF',
    hoverBgColor: '#2B95FF',
    vibrationPattern: VIBRATION_PATTERNS.TAP,
  },
  command: 'thunderbird',
}

/**
 * 音量表示の設定
 */
export const volumeDisplayConfig: VolumeDisplayConfig = {
  position: { col: 0, row: 0 },
  options: {
    cellBgColor: '#1a1a2e',
    cellBorderColor: '#4a6a8a',
    barFillColor: '#4a9eff',
  },
}

/**
 * メディア表示の設定
 */
export const mediaDisplayConfig: MediaDisplayConfig = {
  position: { col: 0, row: 1 },
  options: {
    cellBgColor: '#1a1a2e',
    cellBorderColor: '#8a4a6a',
    titleColor: '#FFFFFF',
    artistColor: '#FF88AA',
    statusColor: '#AAAAAA',
    iconColor: '#FF88AA',
  },
}

/**
 * ワークスペースセットアップボタンの設定
 */
export const workspaceSetupButtonConfig: ButtonConfig = {
  position: { col: 0, row: 1 },
  appName: 'preferences-system', // システム設定アイコン
  options: {
    label: 'Setup',
    iconSize: 48,
    bgColor: '#00AA55',
    borderColor: '#22CC77',
    textColor: '#FFFFFF',
    hoverBgColor: '#22BB66',
    vibrationPattern: VIBRATION_PATTERNS.TAP,
  },
  command: '/home/archfill/git/loupedeck-linux/scripts/workspace-setup.sh',
}

/**
 * 1Passwordロック解除ボタンの設定
 */
export const onePasswordUnlockButtonConfig: ButtonConfig = {
  position: { col: 2, row: 1 },
  appName: 'security-high', // セキュリティ・鍵アイコン
  options: {
    label: 'Unlock',
    iconSize: 48,
    bgColor: '#00AA88',
    borderColor: '#22CCAA',
    textColor: '#FFFFFF',
    hoverBgColor: '#22BB99',
    vibrationPattern: VIBRATION_PATTERNS.TAP,
  },
  command: '/home/archfill/git/loupedeck-linux/scripts/1password-unlock.sh',
}

/**
 * wlogoutボタンの設定
 */
export const wlogoutButtonConfig: ButtonConfig = {
  position: { col: 4, row: 0 },
  appName: 'system-shutdown', // ログアウト・シャットダウンアイコン
  options: {
    label: 'Logout',
    iconSize: 48,
    bgColor: '#D32F2F',
    borderColor: '#F44336',
    textColor: '#FFFFFF',
    hoverBgColor: '#E53935',
    vibrationPattern: VIBRATION_PATTERNS.TAP,
  },
  command: 'wlogout',
}

/**
 * メディアコントロール: 前のトラックボタンの設定
 */
export const mediaPreviousButtonConfig: ButtonConfig = {
  position: { col: 1, row: 2 },
  appName: 'media-skip-backward', // メディアアイコン（フォールバック用）
  options: {
    label: 'Previous',
    icon: '󰒮', // NerdFont: mdi-skip-previous (U+F04AE)
    iconSize: 56,
    bgColor: '#6A1B9A',
    borderColor: '#8E24AA',
    textColor: '#FFFFFF',
    hoverBgColor: '#7B1FA2',
    vibrationPattern: VIBRATION_PATTERNS.TAP,
  },
  command: 'playerctl previous',
}

/**
 * メディアコントロール: 再生/一時停止ボタンの設定
 */
export const mediaPlayPauseButtonConfig: ButtonConfig = {
  position: { col: 2, row: 2 },
  appName: 'media-playback-start', // メディアアイコン（フォールバック用）
  options: {
    label: 'Play/Pause',
    icon: '󰐊', // NerdFont: mdi-play (U+F040A)
    iconSize: 56,
    bgColor: '#C62828',
    borderColor: '#E53935',
    textColor: '#FFFFFF',
    hoverBgColor: '#D32F2F',
    vibrationPattern: VIBRATION_PATTERNS.TAP,
  },
  command: 'playerctl play-pause',
}

/**
 * メディアコントロール: 次のトラックボタンの設定
 */
export const mediaNextButtonConfig: ButtonConfig = {
  position: { col: 3, row: 2 },
  appName: 'media-skip-forward', // メディアアイコン（フォールバック用）
  options: {
    label: 'Next',
    icon: '󰒭', // NerdFont: mdi-skip-next (U+F04AD)
    iconSize: 56,
    bgColor: '#6A1B9A',
    borderColor: '#8E24AA',
    textColor: '#FFFFFF',
    hoverBgColor: '#7B1FA2',
    vibrationPattern: VIBRATION_PATTERNS.TAP,
  },
  command: 'playerctl next',
}
