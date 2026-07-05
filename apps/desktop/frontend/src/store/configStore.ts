import { create } from 'zustand'
import type { Config } from '../types/config'
import { backendClient } from '../lib/backendClient'

interface ConfigStore {
  config: Config | null
  loading: boolean
  error: string | null
  fetchConfig: () => Promise<void>
  setConfig: (config: Config) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: null,
  loading: true,
  error: null,

  fetchConfig: async () => {
    set({ loading: true, error: null })
    try {
      const data = await backendClient.getConfig()
      set({ config: data, loading: false })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      set({ error: errorMessage, loading: false })
    }
  },

  setConfig: (config) => set({ config }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))
