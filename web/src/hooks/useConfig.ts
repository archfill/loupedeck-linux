import { useQuery } from '@tanstack/react-query'

interface Component {
  position: { col: number; row: number }
  appName?: string
  options?: {
    label?: string
    bgColor?: string
    borderColor?: string
    textColor?: string
    icon?: string
    iconSize?: number
  }
  command?: string
}

interface Device {
  type?: string
  grid?: { columns: number; rows: number }
  knobs?: string[]
  buttons?: number[]
}

interface Constants {
  autoUpdateInterval?: number
  buttonLedColors?: Record<number, string>
  knobIds?: Record<string, string>
  volumeStep?: number
  volumeDisplayTimeout?: number
}

export interface Config {
  components?: Record<string, Component>
  constants?: Constants
  device?: Device
}

const fetchConfig = async (): Promise<Config> => {
  const response = await fetch('/api/config')
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}

export const useConfig = () => {
  return useQuery({
    queryKey: ['config'],
    queryFn: fetchConfig,
    refetchInterval: 10000, // 自動更新: 10秒ごと
  })
}
