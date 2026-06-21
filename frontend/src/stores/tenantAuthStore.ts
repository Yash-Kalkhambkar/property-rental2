import { create } from 'zustand'
import { createApiClient } from '@/api/createApiClient'
import type { TenantProfile } from '@/types/tenant'

const STORAGE_KEY = 'rentease-tenant'

interface TenantAuthState {
  accessToken: string | null
  tenant: TenantProfile | null
  setAccessToken: (token: string) => void
  setTenant: (tenant: TenantProfile) => void
  logout: () => void
  isAuthenticated: () => boolean
  hydrate: () => void
}

function loadSession(): Pick<TenantAuthState, 'accessToken' | 'tenant'> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { accessToken: null, tenant: null }
    return JSON.parse(raw)
  } catch {
    return { accessToken: null, tenant: null }
  }
}

function persistSession(accessToken: string | null, tenant: TenantProfile | null) {
  if (!accessToken) {
    sessionStorage.removeItem(STORAGE_KEY)
    return
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, tenant }))
}

export const useTenantAuthStore = create<TenantAuthState>((set, get) => ({
  ...loadSession(),

  setAccessToken: (token) => {
    set({ accessToken: token })
    persistSession(token, get().tenant)
  },

  setTenant: (tenant) => {
    set({ tenant })
    persistSession(get().accessToken, tenant)
  },

  logout: () => {
    // Clear chat history for this tenant before wiping the session
    const tenantId = get().tenant?.id
    if (tenantId) {
      sessionStorage.removeItem(`rentease-chat-tenant-${tenantId}`)
    }
    sessionStorage.removeItem(STORAGE_KEY)
    set({ accessToken: null, tenant: null })
  },

  isAuthenticated: () => !!get().accessToken,

  hydrate: () => set(loadSession()),
}))

export const tenantApi = createApiClient({
  refreshPath: '/auth/tenant/refresh',
  getToken: () => useTenantAuthStore.getState().accessToken,
  setToken: (token) => useTenantAuthStore.getState().setAccessToken(token),
  logout: () => useTenantAuthStore.getState().logout(),
  loginPath: '/tenant/login',
})
