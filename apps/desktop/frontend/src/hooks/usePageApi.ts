import { useState } from 'react'
import type { UpdatePageMetaRequest } from '../types/config'
import { backendClient } from '../lib/backendClient'

export function usePageApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPage = async (title?: string, description?: string): Promise<string> => {
    setLoading(true)
    setError(null)

    try {
      return await backendClient.createPage(title, description)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deletePage = async (pageNum: string): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      await backendClient.deletePage(pageNum)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updatePageMeta = async (pageNum: string, meta: UpdatePageMetaRequest): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      await backendClient.updatePageMeta(pageNum, meta)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { createPage, deletePage, updatePageMeta, loading, error }
}
