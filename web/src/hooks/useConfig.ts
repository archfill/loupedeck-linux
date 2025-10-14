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
  knobs?: any[]
  buttons?: any[]
}

export interface Config {
  components?: Record<string, Component>
  constants?: any
  device?: Device
}

const fetchConfig = async (): Promise<Config> => {
  const response = await fetch('http://localhost:3000/api/config')
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
