/**
 * コンポーネントファクトリー
 *
 * 設定から適切なコンポーネントを動的に生成します。
 */

import { Clock } from '../components/Clock.ts'
import { Button } from '../components/Button.ts'
import { VolumeDisplay } from '../components/VolumeDisplay.ts'
import { MediaDisplay } from '../components/MediaDisplay.ts'
import { MediaPlayPauseButton } from '../components/MediaPlayPauseButton.ts'
import { IconResolver } from './iconResolver.ts'
import type {
  Component,
  ClockComponent,
  ButtonComponent,
  VolumeDisplayComponent,
  MediaDisplayComponent,
} from '../config/configLoader.ts'
import type { VibrationUtil } from './vibration.ts'
import type { AppLauncher } from './appLauncher.ts'
import type { VolumeControl } from './volumeControl.ts'
import type { MediaControl } from './mediaControl.ts'

/**
 * コンポーネント生成に必要な依存関係
 */
export interface ComponentDependencies {
  vibration: VibrationUtil | null
  appLauncher: AppLauncher
  volumeControl: VolumeControl
  mediaControl: MediaControl
}

/**
 * 生成可能なコンポーネントの型
 */
export type GeneratedComponent = Clock | Button | VolumeDisplay | MediaDisplay | MediaPlayPauseButton

/**
 * 型ガード: ButtonComponent かどうか
 */
function isButtonComponent(config: Component): config is ButtonComponent {
  return config.type === 'button'
}

/**
 * 型ガード: ClockComponent かどうか
 */
function isClockComponent(config: Component): config is ClockComponent {
  return config.type === 'clock'
}

/**
 * 型ガード: VolumeDisplayComponent かどうか
 */
function isVolumeDisplayComponent(config: Component): config is VolumeDisplayComponent {
  return config.type === 'volumeDisplay'
}

/**
 * 型ガード: MediaDisplayComponent かどうか
 */
function isMediaDisplayComponent(config: Component): config is MediaDisplayComponent {
  return config.type === 'mediaDisplay'
}

/**
 * 設定からコンポーネントを動的に生成
 *
 * @param componentName - コンポーネント名（特殊ケースの判別に使用）
 * @param config - コンポーネント設定
 * @param deps - 依存関係
 * @returns 生成されたコンポーネント
 */
export function createComponent(
  componentName: string,
  config: Component,
  deps: ComponentDependencies
): GeneratedComponent {
  const { vibration, appLauncher, volumeControl, mediaControl } = deps

  // ButtonComponent の処理
  if (isButtonComponent(config)) {
    const { position, appName, options, command } = config

    // MediaPlayPauseButton の特別処理
    if (componentName === 'mediaPlayPauseButton') {
      return new MediaPlayPauseButton(position.col, position.row, mediaControl, {
        ...options,
        vibration,
        onClick: () => appLauncher.launch(command),
      })
    }

    // 通常のButton
    // iconがある場合はIconResolverを使用しない（NerdFont等）
    const iconImage = options.icon ? undefined : IconResolver.resolve(appName)

    return new Button(position.col, position.row, {
      ...options,
      iconImage,
      vibration,
      onClick: () => appLauncher.launch(command),
    })
  }

  // ClockComponent の処理
  if (isClockComponent(config)) {
    const { position, options } = config
    return new Clock(position.col, position.row, options)
  }

  // VolumeDisplayComponent の処理
  if (isVolumeDisplayComponent(config)) {
    const { position, options } = config
    return new VolumeDisplay(position.col, position.row, volumeControl, {
      ...options,
      vibration,
    })
  }

  // MediaDisplayComponent の処理
  if (isMediaDisplayComponent(config)) {
    const { position, options } = config
    return new MediaDisplay(position.col, position.row, mediaControl, {
      ...options,
      vibration,
    })
  }

  // 未知の設定タイプ
  throw new Error(`Unknown component config type for component: ${componentName}`)
}
