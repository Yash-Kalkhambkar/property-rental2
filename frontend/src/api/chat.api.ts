/**
 * Streams a chat response from the backend via SSE.
 *
 * Uses API_BASE_URL (from VITE_API_BASE_URL env var) — the same base URL
 * every other API call in this project uses. This ensures it works both
 * locally (via Vite proxy) and in production (direct backend URL on Render).
 */

import { API_BASE_URL } from '@/types/common'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function streamChatMessage({
  messages,
  token,
  portal,
  onToken,
  onDone,
  onError,
}: {
  messages: ChatMessage[]
  token: string
  portal: 'owner' | 'tenant'
  onToken: (token: string) => void
  onDone: () => void
  onError: (msg: string) => void
}) {
  // API_BASE_URL = e.g. "https://rental-api.onrender.com/api/v1" in production
  //                      "/api/v1" locally (proxied by Vite to 127.0.0.1:8000)
  const endpoint = `${API_BASE_URL}/chat/${portal}`
  console.log(`[RentEase AI] POST ${endpoint}`)

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages }),
    })
  } catch {
    onError('Could not reach the server. Check your connection.')
    return
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.error(`[RentEase AI] ${response.status} ${response.statusText}`, body)
    onError(`Server error ${response.status}. Please try again.`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError('Stream not available.')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') {
        onDone()
        return
      }
      try {
        const parsed = JSON.parse(data)
        if (parsed.error) {
          onError(parsed.error)
          return
        }
        if (parsed.token) {
          onToken(parsed.token)
        }
      } catch {
        // malformed chunk, skip
      }
    }
  }

  onDone()
}
