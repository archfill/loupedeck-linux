import { VIBRATION_PATTERNS } from './constants.js'

/**
 * コンポーネント設定
 * 各コンポーネントの位置とオプションを定義
 */

/**
 * 時計コンポーネントの設定
 */
export const clockConfig = {
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
export const firefoxButtonConfig = {
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
export const onePasswordButtonConfig = {
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
 * 音量表示の設定
 */
export const volumeDisplayConfig = {
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
export const mediaDisplayConfig = {
  position: { col: 2, row: 0 },
  options: {
    cellBgColor: '#1a1a2e',
    cellBorderColor: '#8a4a6a',
    titleColor: '#FFFFFF',
    artistColor: '#FF88AA',
    statusColor: '#AAAAAA',
    iconColor: '#FF88AA',
  },
}
