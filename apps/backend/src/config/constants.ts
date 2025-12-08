/**
 * アプリケーション全体で使用される定数
 */

// 音量制御
export const VOLUME_STEP_PERCENT = 5 as const // ノブ1回転あたりの音量変化（%）
export const VOLUME_DISPLAY_TIMEOUT_MS = 2000 as const // 音量表示の自動非表示時間（ミリ秒）

// デバイス
export const KNOB_IDS = {
  TOP_LEFT: 'knobTL',
  CENTER_LEFT: 'knobCL',
} as const

export type KnobId = (typeof KNOB_IDS)[keyof typeof KNOB_IDS]

// UI更新
export const AUTO_UPDATE_INTERVAL_MS = 1000 as const // 自動更新インターバル（ミリ秒）

// 振動パターン名
export const VIBRATION_PATTERNS = {
  TAP: 'tap',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  CONNECT: 'connect',
} as const

export type VibrationPattern = (typeof VIBRATION_PATTERNS)[keyof typeof VIBRATION_PATTERNS]

// 物理ボタンのLED色設定（HEX形式）
export const BUTTON_LED_COLORS: Record<number, string> = {
  0: '#FFFFFF', // 左下: 白
  1: '#FF0000', // 右上: 赤
  2: '#00FF00', // 右中央: 緑
  3: '#0000FF', // 右下: 青
}
