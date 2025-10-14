/**
 * アプリケーション全体で使用される定数
 */

// 音量制御
export const VOLUME_STEP_PERCENT = 5 // ノブ1回転あたりの音量変化（%）
export const VOLUME_DISPLAY_TIMEOUT_MS = 2000 // 音量表示の自動非表示時間（ミリ秒）

// デバイス
export const KNOB_IDS = {
  TOP_LEFT: 'knobTL', // 左上のノブ
  CENTER_LEFT: 'knobCL', // 中央左のノブ
}

// UI更新
export const AUTO_UPDATE_INTERVAL_MS = 1000 // 自動更新インターバル（ミリ秒）

// 振動パターン名
export const VIBRATION_PATTERNS = {
  TAP: 'tap',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  CONNECT: 'connect',
}
