import { useQuery } from '@tanstack/react-query'
import type { Config } from '../types/config'
import { backendClient } from '../lib/backendClient'

const fetchConfig = async (): Promise<Config> => {
  return backendClient.getConfig()
}

export const useConfig = () => {
  return useQuery({
    queryKey: ['config'],
    queryFn: fetchConfig,
    refetchInterval: 10000, // 自動更新: 10秒ごと
  })
}
