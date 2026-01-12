import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Config, PagesConfig, SaveStatus } from '../types/config'

type UseConfigSyncOptions = {
  config?: Config
  debounceMs?: number
  endpoint?: string
}

type UseConfigSyncResult = {
  editedConfig: Config | null
  setEditedConfig: Dispatch<SetStateAction<Config | null>>
  saveStatus: SaveStatus
  saveMessage: string
  queueImmediateSave: (pages: PagesConfig | undefined) => void
  queueDebouncedSave: (pages: PagesConfig | undefined) => void
  flushDebouncedSave: () => void
}

const DEFAULT_DEBOUNCE_MS = 500
const AUTO_RESET_MS = 5000

export const useConfigSync = ({
  config,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  endpoint = '/api/config',
}: UseConfigSyncOptions): UseConfigSyncResult => {
  const [editedConfig, setEditedConfig] = useState<Config | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveMessage, setSaveMessage] = useState('')

  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const pendingRef = useRef(0)
  const lastResultRef = useRef<'success' | 'error' | null>(null)
  const debounceTimerRef = useRef<number | null>(null)
  const debouncedSnapshotRef = useRef<PagesConfig | null>(null)
  const statusResetTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (config && !editedConfig) {
      setEditedConfig(config)
    }
  }, [config, editedConfig])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }
      if (statusResetTimerRef.current) {
        window.clearTimeout(statusResetTimerRef.current)
      }
    }
  }, [])

  const scheduleStatusReset = useCallback((status: SaveStatus, message: string) => {
    setSaveStatus(status)
    setSaveMessage(message)
    if (statusResetTimerRef.current) {
      window.clearTimeout(statusResetTimerRef.current)
    }
    statusResetTimerRef.current = window.setTimeout(() => {
      setSaveStatus('idle')
      setSaveMessage('')
    }, AUTO_RESET_MS)
  }, [])

  const postSnapshot = useCallback(
    async (pages: PagesConfig) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pages),
      })

      if (!response.ok) {
        throw new Error('Failed to save configuration')
      }
    },
    [endpoint]
  )

  const enqueueSave = useCallback(
    (pages: PagesConfig | undefined | null) => {
      if (!pages) return

      pendingRef.current += 1
      setSaveStatus('saving')
      setSaveMessage('')

      const snapshot = pages

      queueRef.current = queueRef.current
        .catch(() => {})
        .then(async () => {
          try {
            await postSnapshot(snapshot)
            lastResultRef.current = 'success'
          } catch (err) {
            lastResultRef.current = 'error'
            const message = err instanceof Error ? err.message : 'Unknown error occurred'
            scheduleStatusReset('error', message)
          } finally {
            pendingRef.current -= 1
            if (pendingRef.current === 0 && lastResultRef.current === 'success') {
              scheduleStatusReset('success', 'Configuration saved!')
            }
          }
        })
    },
    [postSnapshot, scheduleStatusReset]
  )

  const clearDebounced = useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    debouncedSnapshotRef.current = null
  }, [])

  const flushDebouncedSave = useCallback(() => {
    if (!debouncedSnapshotRef.current) {
      clearDebounced()
      return
    }

    const snapshot = debouncedSnapshotRef.current
    clearDebounced()
    enqueueSave(snapshot)
  }, [clearDebounced, enqueueSave])

  const queueImmediateSave = useCallback(
    (pages: PagesConfig | undefined) => {
      clearDebounced()
      enqueueSave(pages)
    },
    [clearDebounced, enqueueSave]
  )

  const queueDebouncedSave = useCallback(
    (pages: PagesConfig | undefined) => {
      if (!pages) return
      debouncedSnapshotRef.current = pages
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = window.setTimeout(() => {
        const snapshot = debouncedSnapshotRef.current
        debouncedSnapshotRef.current = null
        debounceTimerRef.current = null
        enqueueSave(snapshot)
      }, debounceMs)
    },
    [debounceMs, enqueueSave]
  )

  return {
    editedConfig,
    setEditedConfig,
    saveStatus,
    saveMessage,
    queueImmediateSave,
    queueDebouncedSave,
    flushDebouncedSave,
  }
}
