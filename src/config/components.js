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
  options: {
    label: 'Firefox',
    iconImage: 'assets/icons/firefox.png',
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
