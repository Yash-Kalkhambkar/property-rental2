import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChatCircleDots,
  PaperPlaneTilt,
  X,
  Trash,
  Robot,
  User,
  SpinnerGap,
  WarningCircle,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import {
  useOwnerChatStore,
  useTenantChatStore,
  hydrateChat,
  persistChat,
  clearChat,
} from '@/stores/chatStore'
import { streamChatMessage } from '@/api/chat.api'

interface Props {
  portal: 'owner' | 'tenant'
  token: string | null
  userId: string | null   // owner.id or tenant.id — used to key sessionStorage
}

const SUGGESTED: Record<'owner' | 'tenant', string[]> = {
  owner: [
    'How do I add a tenant?',
    'How do I record a payment?',
    'What should I do about overdue rent?',
    'How do I create a lease?',
  ],
  tenant: [
    'Where can I see my upcoming payments?',
    'How do I change my password?',
    'What does "overdue" status mean?',
    'How do I contact my landlord?',
  ],
}

export function AiChat({ portal, token, userId }: Props) {
  // Pick the right store for this portal (two separate instances, never shared)
  const store = portal === 'owner' ? useOwnerChatStore : useTenantChatStore
  const {
    isOpen, messages, isStreaming,
    toggle, close, addMessage, appendToLast,
    startStreaming, stopStreaming,
  } = store()

  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hydratedRef = useRef(false)

  const isOwner = portal === 'owner'
  const hasMessages = messages.length > 0

  // ── Hydrate from sessionStorage once userId is available ─────────────────
  useEffect(() => {
    if (!userId || hydratedRef.current) return
    hydratedRef.current = true
    hydrateChat(portal, userId)
  }, [portal, userId])

  // ── Persist to sessionStorage after every message change ─────────────────
  useEffect(() => {
    if (!userId || !hydratedRef.current) return
    persistChat(portal, userId, messages)
  }, [messages, portal, userId])

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Focus input when panel opens ──────────────────────────────────────────
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150)
  }, [isOpen])

  // ── Send message ──────────────────────────────────────────────────────────
  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isStreaming || !token) return
    setInput('')
    setError(null)

    const userMsg = { role: 'user' as const, content }
    addMessage(userMsg)
    addMessage({ role: 'assistant', content: '' })  // placeholder for streaming
    startStreaming()

    await streamChatMessage({
      messages: [...messages, userMsg],
      token,
      portal,
      onToken: (tok) => appendToLast(tok),
      onDone: () => stopStreaming(),
      onError: (msg) => {
        stopStreaming()
        setError(msg)
        appendToLast('Sorry, something went wrong. Please try again.')
      },
    })
  }

  const handleClear = () => {
    if (userId) clearChat(portal, userId)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* ── Floating button ─────────────────────────────────────────────── */}
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Open AI assistant"
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-colors',
          isOwner
            ? 'bg-owner-accent text-white shadow-[0_0_32px_-6px_rgba(59,130,246,0.6)]'
            : 'bg-tenant-accent text-white shadow-[0_0_32px_-6px_rgba(13,148,136,0.5)]',
          // On mobile keep it above the bottom nav bar
          'max-md:bottom-20',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X weight="bold" size={22} />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChatCircleDots weight="fill" size={24} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Chat panel ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className={cn(
              'fixed z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden',
              'bottom-24 right-6 w-[360px] max-h-[560px]',
              'max-sm:left-3 max-sm:right-3 max-sm:w-auto max-sm:bottom-20',
              isOwner
                ? 'glass-owner border border-white/[0.1]'
                : 'glass-tenant border border-tenant-border',
            )}
          >
            {/* Header */}
            <div className={cn(
              'flex items-center justify-between px-4 py-3 border-b shrink-0',
              isOwner ? 'border-white/[0.08]' : 'border-tenant-border',
            )}>
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl',
                  isOwner ? 'bg-owner-accent/20 text-owner-accent' : 'bg-tenant-accent/20 text-tenant-accent',
                )}>
                  <Robot weight="duotone" size={16} />
                </div>
                <div>
                  <p className={cn('text-sm font-semibold leading-none', isOwner ? 'text-owner-text' : 'text-tenant-text')}>
                    RentEase AI
                  </p>
                  <p className={cn('text-[10px] mt-0.5', isOwner ? 'text-owner-muted' : 'text-tenant-muted')}>
                    {isStreaming ? 'Thinking…' : 'Ask me anything'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {hasMessages && (
                  <button
                    onClick={handleClear}
                    title="Clear chat history"
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                      isOwner
                        ? 'text-owner-muted hover:text-owner-text hover:bg-owner-elevated'
                        : 'text-tenant-muted hover:text-tenant-text hover:bg-tenant-accent/10',
                    )}
                  >
                    <Trash weight="regular" size={14} />
                  </button>
                )}
                <button
                  onClick={close}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                    isOwner
                      ? 'text-owner-muted hover:text-owner-text hover:bg-owner-elevated'
                      : 'text-tenant-muted hover:text-tenant-text hover:bg-tenant-accent/10',
                  )}
                >
                  <X weight="bold" size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
              {!hasMessages ? (
                // Empty state with suggested prompts
                <div className="flex flex-col items-center justify-center h-full py-6 gap-4">
                  <div className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-2xl',
                    isOwner ? 'bg-owner-accent/15 text-owner-accent' : 'bg-tenant-accent/15 text-tenant-accent',
                  )}>
                    <Robot weight="duotone" size={26} />
                  </div>
                  <div className="text-center">
                    <p className={cn('text-sm font-semibold', isOwner ? 'text-owner-text' : 'text-tenant-text')}>
                      Hi! I'm your RentEase assistant.
                    </p>
                    <p className={cn('text-xs mt-1', isOwner ? 'text-owner-muted' : 'text-tenant-muted')}>
                      Ask about features, get tips, or just explore.
                    </p>
                  </div>
                  <div className="w-full space-y-1.5">
                    {SUGGESTED[portal].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => send(prompt)}
                        className={cn(
                          'w-full rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors',
                          isOwner
                            ? 'bg-owner-elevated text-owner-muted hover:text-owner-text hover:bg-white/[0.1]'
                            : 'bg-tenant-accent/8 text-tenant-muted hover:text-tenant-text hover:bg-tenant-accent/15 border border-tenant-border',
                        )}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <MessageBubble
                    key={i}
                    msg={msg}
                    isOwner={isOwner}
                    isActiveStream={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
                  />
                ))
              )}

              {error && (
                <div className="flex items-center gap-2 text-danger text-xs px-1">
                  <WarningCircle weight="fill" size={14} />
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={cn('p-3 border-t shrink-0', isOwner ? 'border-white/[0.08]' : 'border-tenant-border')}>
              <div className={cn(
                'flex items-end gap-2 rounded-xl px-3 py-2',
                isOwner ? 'bg-owner-elevated' : 'bg-white/60 border border-tenant-border',
              )}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything… (Enter to send)"
                  rows={1}
                  disabled={isStreaming}
                  className={cn(
                    'flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-sm',
                    'max-h-28 scrollbar-thin',
                    isOwner ? 'text-owner-text placeholder:text-owner-muted/60' : 'text-tenant-text placeholder:text-tenant-muted/70',
                    isStreaming && 'opacity-50',
                  )}
                  style={{ fieldSizing: 'content' } as React.CSSProperties}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || isStreaming}
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all',
                    isOwner
                      ? 'bg-owner-accent text-white disabled:opacity-30 hover:bg-[#2563eb]'
                      : 'bg-tenant-accent text-white disabled:opacity-30',
                    'disabled:cursor-not-allowed',
                  )}
                >
                  {isStreaming
                    ? <SpinnerGap weight="bold" size={14} className="animate-spin" />
                    : <PaperPlaneTilt weight="fill" size={14} />
                  }
                </button>
              </div>
              <p className={cn('text-[10px] text-center mt-1.5', isOwner ? 'text-owner-muted/50' : 'text-tenant-muted/60')}>
                AI can make mistakes — verify important info
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isOwner,
  isActiveStream,
}: {
  msg: { role: 'user' | 'assistant'; content: string }
  isOwner: boolean
  isActiveStream: boolean
}) {
  const isUser = msg.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg mt-0.5',
          isOwner ? 'bg-owner-accent/20 text-owner-accent' : 'bg-tenant-accent/20 text-tenant-accent',
        )}>
          <Robot weight="duotone" size={13} />
        </div>
      )}

      <div className={cn(
        'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap',
        isUser
          ? isOwner
            ? 'bg-owner-accent text-white rounded-tr-sm'
            : 'bg-tenant-accent text-white rounded-tr-sm'
          : isOwner
            ? 'bg-owner-elevated text-owner-text rounded-tl-sm'
            : 'bg-white/90 text-tenant-text rounded-tl-sm border border-tenant-border',
      )}>
        {msg.content || (isActiveStream ? <TypingIndicator isOwner={isOwner} /> : null)}
      </div>

      {isUser && (
        <div className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg mt-0.5',
          isOwner ? 'bg-owner-elevated text-owner-muted' : 'bg-tenant-accent/10 text-tenant-muted',
        )}>
          <User weight="duotone" size={13} />
        </div>
      )}
    </motion.div>
  )
}

function TypingIndicator({ isOwner }: { isOwner: boolean }) {
  return (
    <span className="flex items-center gap-1 h-4">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={cn(
            'inline-block h-1.5 w-1.5 rounded-full',
            isOwner ? 'bg-owner-muted' : 'bg-tenant-muted',
          )}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  )
}
