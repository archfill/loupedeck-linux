import { useState } from 'react'
import type { CreatePageRequest, CreatePageResponse, UpdatePageMetaRequest } from '../types/config'

const API_BASE = 'http://localhost:9876'

export function usePageApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPage = async (title?: string, description?: string): Promise<string> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/api/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description } satisfies CreatePageRequest),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create page')
      }

      const data = (await response.json()) as CreatePageResponse
      return data.pageNum
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
      const response = await fetch(`${API_BASE}/api/pages/${pageNum}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete page')
      }

      await response.json()
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
      const response = await fetch(`${API_BASE}/api/pages/${pageNum}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update page meta')
      }

      await response.json()
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
