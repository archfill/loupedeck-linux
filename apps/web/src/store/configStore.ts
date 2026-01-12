import { create } from 'zustand'

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

interface Config {
  components?: Record<string, Component>
  constants?: Constants
  device?: Device
}

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
      const response = await fetch('http://localhost:9876/api/config')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
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
