export type RegisterRequest = {
  inviteCode: string
  email: string
  password: string
  zulipEmail: string
  zulipToken: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type UpdateZulipRequest = {
  zulipEmail: string
  zulipToken: string
}

export type StreamItem = {
  id: number
  name: string
}

export type TopicItem = {
  name: string
  max_message_id: number
}

export type MessageItem = {
  id: number
  sender_full_name: string
  sender_email: string
  timestamp: number
  content: string
}

type ApiError = {
  error?: string
}

const request = async <T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> => {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(path, {
    ...options,
    headers,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    const message =
      (payload as ApiError | null)?.error || response.statusText || 'Request failed.'
    throw new Error(message)
  }

  return payload as T
}

export const register = (payload: RegisterRequest) =>
  request<{ ok: boolean }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const login = (payload: LoginRequest) =>
  request<{ token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const fetchMe = (token: string) =>
  request<{ email: string | null }>('/api/auth/me', {}, token)

export const updateZulipCredentials = (token: string, payload: UpdateZulipRequest) =>
  request<{ ok: boolean }>(
    '/api/auth/zulip',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  )

export const fetchStreams = async (token: string) => {
  const response = await request<{ streams: StreamItem[] }>('/api/streams', {}, token)
  return response.streams
}

export const fetchTopics = async (token: string, streamId: number) => {
  const response = await request<{ topics: TopicItem[] }>(
    `/api/streams/${streamId}/topics`,
    {},
    token,
  )
  return response.topics
}

export const fetchMessages = async (token: string, streamId: number, topic: string) => {
  const params = new URLSearchParams({
    streamId: streamId.toString(),
    topic,
    anchor: 'latest',
    numBefore: '50',
    numAfter: '0',
  })
  const response = await request<{ messages: MessageItem[] }>(
    `/api/messages?${params.toString()}`,
    {},
    token,
  )
  return response.messages
}

export const sendMessage = (token: string, payload: { streamId: number; topic: string; content: string }) =>
  request<{ message_id: number }>(
    '/api/messages',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  )
