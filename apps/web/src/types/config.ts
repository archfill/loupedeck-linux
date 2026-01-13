export type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

export type IconType = 'none' | 'nerdfont' | 'auto' | 'image'

export interface ComponentPosition {
  col: number
  row: number
}

export interface ComponentOptions {
  label?: string
  bgColor?: string
  borderColor?: string
  textColor?: string
  icon?: string
  iconImage?: string
  iconType?: IconType
  iconSize?: number
  hoverBgColor?: string
  vibrationPattern?: string
  ledColor?: string
}

export interface ComponentConfig {
  type?: string
  position?: ComponentPosition
  appName?: string
  options?: ComponentOptions
  command?: string
  [key: string]: unknown
}

export interface PageMeta {
  title: string
  description: string
}

export interface PageData {
  _meta?: PageMeta
  [key: string]: ComponentConfig | PageMeta | undefined
}

export interface Device {
  type?: string
  grid?: { columns: number; rows: number }
  knobs?: string[]
  buttons?: number[]
}

export interface Constants {
  autoUpdateInterval?: number
  buttonLedColors?: Record<number, string>
  knobIds?: Record<string, string>
  volumeStep?: number
  volumeDisplayTimeout?: number
}

export interface Config {
  components?: Record<string, ComponentConfig>
  pages?: Record<string, PageData>
  constants?: Constants
  device?: Device
}

export type PagesConfig = Record<string, PageData>

// Page Management API Types
export interface CreatePageRequest {
  title?: string
  description?: string
}

export interface CreatePageResponse {
  success: boolean
  pageNum: string
  pages: PagesConfig
}

export interface UpdatePageMetaRequest {
  title: string
  description: string
}

export interface UpdatePageMetaResponse {
  success: boolean
  pageNum: string
  meta: PageMeta
}

export interface DeletePageResponse {
  success: boolean
  deletedPageNum: string
  pages: PagesConfig
}
