import type { PageMeta, PagesConfig, Config } from '../types/config'

type TauriInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>

type IconResolveResult = {
  appName: string
  iconPath: string
}

const isTauriRuntime = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const invokeCommand = async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
  const { invoke } = (await import('@tauri-apps/api/core')) as { invoke: TauriInvoke }
  return invoke<T>(command, args)
}

const requestJson = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, options)
  if (!response.ok) {
    let message = `HTTP error! status: ${response.status}`
    try {
      const errorData = (await response.json()) as { message?: string }
      message = errorData.message || message
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export const backendClient = {
  isTauri: isTauriRuntime,

  getConfig: async (): Promise<Config> => {
    if (isTauriRuntime()) {
      return invokeCommand<Config>('get_config')
    }

    return requestJson<Config>('/api/config')
  },

  savePages: async (pages: PagesConfig): Promise<void> => {
    if (isTauriRuntime()) {
      await invokeCommand<void>('save_pages', { pages })
      return
    }

    await requestJson<void>('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pages),
    })
  },

  createPage: async (title?: string, description?: string): Promise<string> => {
    if (isTauriRuntime()) {
      return invokeCommand<string>('create_page', { title, description })
    }

    const data = await requestJson<{ pageNum: string }>('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    })
    return data.pageNum
  },

  deletePage: async (pageNum: string): Promise<void> => {
    if (isTauriRuntime()) {
      await invokeCommand<void>('delete_page', { pageNum })
      return
    }

    await requestJson<void>(`/api/pages/${pageNum}`, {
      method: 'DELETE',
    })
  },

  updatePageMeta: async (pageNum: string, meta: PageMeta): Promise<void> => {
    if (isTauriRuntime()) {
      await invokeCommand<void>('update_page_meta', {
        pageNum,
        title: meta.title,
        description: meta.description,
      })
      return
    }

    await requestJson<void>(`/api/pages/${pageNum}/meta`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meta),
    })
  },

  resolveIcon: async (appName: string): Promise<IconResolveResult | null> => {
    if (isTauriRuntime()) {
      return null
    }

    return requestJson<IconResolveResult>(`/api/icon/resolve/${appName}`)
  },

  iconFileUrl: (iconPath: string): string | null => {
    if (isTauriRuntime()) {
      return null
    }

    return `/api/icon/file?path=${encodeURIComponent(iconPath)}`
  },
}
