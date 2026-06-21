import { create } from 'zustand'
import { createApiClient } from '@/api/createApiClient'
import type { Owner } from '@/types/owner'

const STORAGE_KEY = 'rentease-owner'

interface OwnerAuthState {
  accessToken: string | null
  owner: Owner | null
  setAccessToken: (token: string) => void
  setOwner: (owner: Owner) => void
  logout: () => void
  isAuthenticated: () => boolean
  hydrate: () => void
}

function loadSession(): Pick<OwnerAuthState, 'accessToken' | 'owner'> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { accessToken: null, owner: null }
    return JSON.parse(raw)
  } catch {
    return { accessToken: null, owner: null }
  }
}

function persistSession(accessToken: string | null, owner: Owner | null) {
  if (!accessToken) {
    sessionStorage.removeItem(STORAGE_KEY)
    return
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, owner }))
}

export const useOwnerAuthStore = create<OwnerAuthState>((set, get) => ({
  ...loadSession(),

  setAccessToken: (token) => {
    set({ accessToken: token })
    persistSession(token, get().owner)
  },

  setOwner: (owner) => {
    set({ owner })
    persistSession(get().accessToken, owner)
  },

  logout: () => {
    // Clear chat history for this owner before wiping the session
    const ownerId = get().owner?.id
    if (ownerId) {
      sessionStorage.removeItem(`rentease-chat-owner-${ownerId}`)
    }
    sessionStorage.removeItem(STORAGE_KEY)
    set({ accessToken: null, owner: null })
  },

  isAuthenticated: () => !!get().accessToken,

  hydrate: () => set(loadSession()),
}))

export const ownerApi = createApiClient({
  refreshPath: '/auth/refresh',
  getToken: () => useOwnerAuthStore.getState().accessToken,
  setToken: (token) => useOwnerAuthStore.getState().setAccessToken(token),
  logout: () => useOwnerAuthStore.getState().logout(),
  loginPath: '/login',
})
