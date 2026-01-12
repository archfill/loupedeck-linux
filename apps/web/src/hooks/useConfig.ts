import { useQuery } from '@tanstack/react-query'
import type { Config } from '../types/config'

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
