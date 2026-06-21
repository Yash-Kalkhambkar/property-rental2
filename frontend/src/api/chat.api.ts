/**
 * Streams a chat response from the backend via SSE.
 * Uses a relative /api path so the Vite dev proxy handles it,
 * exactly the same way all other API calls work in this project.
 */

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
  // Relative path — goes through the Vite proxy (/api → http://127.0.0.1:8000)
  // Owner → /api/v1/chat/owner    Tenant → /api/v1/chat/tenant
  const endpoint = `/api/v1/chat/${portal}`
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
    // Log full details to console so we can debug
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
    buffer = lines.pop() ?? ''  // keep incomplete line in buffer

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
