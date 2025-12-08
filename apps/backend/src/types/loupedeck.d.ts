/**
 * loupedeckライブラリの型定義
 * 公式の型定義がないため、必要最小限の型を定義
 */
declare module 'loupedeck' {
  import type { Canvas, CanvasRenderingContext2D } from 'canvas'

  export interface TouchEvent {
    x: number
    y: number
    target: {
      key: number
    }
  }

  export interface RotateEvent {
    id: string
    delta: number
  }

  export interface ButtonEvent {
    id: number | string
  }

  export interface LoupedeckDevice {
    on(event: 'connect', callback: () => void): void
    on(event: 'disconnect', callback: () => void): void
    on(event: 'touchstart', callback: (event: { changedTouches: TouchEvent[] }) => void): void
    on(event: 'touchmove', callback: (event: { changedTouches: TouchEvent[] }) => void): void
    on(event: 'touchend', callback: (event: { changedTouches: TouchEvent[] }) => void): void
    on(event: 'rotate', callback: (event: RotateEvent) => void): void
    on(event: 'down', callback: (event: ButtonEvent) => void): void
    on(event: 'up', callback: (event: ButtonEvent) => void): void
    on(event: string, callback: (...args: unknown[]) => void): void

    once(event: string, callback: (...args: unknown[]) => void): void
    off(event: string, callback: (...args: unknown[]) => void): void
    removeAllListeners(event?: string): void

    setButtonColor(params: { id: number; color: string }): Promise<void>
    drawScreen(
      screen: 'left' | 'center' | 'right',
      callback: (ctx: CanvasRenderingContext2D) => void
    ): Promise<void>
    drawCanvas(screen: 'left' | 'center' | 'right', canvas: Canvas): Promise<void>
    vibrate(pattern: number | number[]): Promise<void>
    close(): Promise<void>

    type: string
    screens: {
      left?: { width: number; height: number }
      center: { width: number; height: number }
      right?: { width: number; height: number }
    }
    displays: {
      left?: { width: number; height: number }
      center: { width: number; height: number }
      right?: { width: number; height: number }
    }
    buttons: number[]
    knobs: string[]
    keySize: number
    columns: number
    rows: number
  }

  export function discover(): Promise<LoupedeckDevice>
}
