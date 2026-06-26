/**
 * Chat store with sessionStorage persistence, keyed by user ID.
 *
 * Storage key format:  rentease-chat-owner-{userId}
 *                      rentease-chat-tenant-{tenantId}
 *
 * This means:
 *  - Every user has their own isolated chat history
 *  - History is shared across tabs in the same session (normal browser behaviour)
 *  - History disappears automatically when the browser tab/session closes
 *  - Zero server-side storage needed
 */

import { create } from 'zustand'
import type { ChatMessage } from '@/api/chat.api'

interface ChatState {
  isOpen: boolean
  messages: ChatMessage[]
  isStreaming: boolean
  open: () => void
  close: () => void
  toggle: () => void
  addMessage: (msg: ChatMessage) => void
  appendToLast: (token: string) => void
  startStreaming: () => void
  stopStreaming: () => void
  clearMessages: () => void
}

// ── sessionStorage helpers ────────────────────────────────────────────────────

function storageKey(portal: 'owner' | 'tenant', userId: string) {
  return `rentease-chat-${portal}-${userId}`
}

function loadMessages(portal: 'owner' | 'tenant', userId: string): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(storageKey(portal, userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveMessages(portal: 'owner' | 'tenant', userId: string, messages: ChatMessage[]) {
  try {
    // Keep at most 60 messages (30 turns) to avoid bloating sessionStorage
    const trimmed = messages.slice(-60)
    sessionStorage.setItem(storageKey(portal, userId), JSON.stringify(trimmed))
  } catch {
    // sessionStorage full or unavailable — fail silently
  }
}

function clearStoredMessages(portal: 'owner' | 'tenant', userId: string) {
  try {
    sessionStorage.removeItem(storageKey(portal, userId))
  } catch {
    // ignore
  }
}

// ── Store factory ─────────────────────────────────────────────────────────────

function createChatStore(_portal: 'owner' | 'tenant') {
  return create<ChatState>((set, _get) => ({
    isOpen: false,
    messages: [],   // hydrated lazily in AiChat when userId is known
    isStreaming: false,

    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((s) => ({ isOpen: !s.isOpen })),

    addMessage: (msg) =>
      set((s) => {
        const messages = [...s.messages, msg]
        return { messages }
      }),

    appendToLast: (token) =>
      set((s) => {
        const msgs = [...s.messages]
        const last = msgs[msgs.length - 1]
        if (last?.role === 'assistant') {
          msgs[msgs.length - 1] = { ...last, content: last.content + token }
        }
        return { messages: msgs }
      }),

    startStreaming: () => set({ isStreaming: true }),
    stopStreaming:  () => set({ isStreaming: false }),

    clearMessages: () => set({ messages: [] }),
  }))
}

// Two separate store instances — owner and tenant never share in-memory state
export const useOwnerChatStore  = createChatStore('owner')
export const useTenantChatStore = createChatStore('tenant')

// ── sessionStorage sync helpers (called from AiChat) ─────────────────────────

/** Load persisted history into the store for this user. Call once on mount. */
export function hydrateChat(portal: 'owner' | 'tenant', userId: string) {
  const messages = loadMessages(portal, userId)
  if (portal === 'owner') {
    useOwnerChatStore.setState({ messages })
  } else {
    useTenantChatStore.setState({ messages })
  }
}

/** Persist the current store messages to sessionStorage. */
export function persistChat(portal: 'owner' | 'tenant', userId: string, messages: ChatMessage[]) {
  saveMessages(portal, userId, messages)
}

/** Wipe both in-memory state and sessionStorage for this user. */
export function clearChat(portal: 'owner' | 'tenant', userId: string) {
  clearStoredMessages(portal, userId)
  if (portal === 'owner') {
    useOwnerChatStore.setState({ messages: [] })
  } else {
    useTenantChatStore.setState({ messages: [] })
  }
}
