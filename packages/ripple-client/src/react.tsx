/**
 * @fileoverview React hooks for @gravito/ripple-client
 * @module @gravito/ripple-client/react
 */

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import type { Channel, PresenceChannel, PrivateChannel } from './Channel'
import { type ConnectionState, RippleClient } from './RippleClient'
import type { EventCallback, PresenceUser, RippleClientConfig } from './types'

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

const RippleContext = createContext<RippleClient | null>(null)

/**
 * Provider component for Ripple client
 */
export function RippleProvider({
  client,
  children,
}: {
  client: RippleClient
  children: ReactNode
}) {
  return <RippleContext.Provider value={client}> {children} </RippleContext.Provider>
}

/**
 * Hook to get the Ripple client instance
 */
export function useRippleClient(): RippleClient {
  const client = useContext(RippleContext)
  if (!client) {
    throw new Error('useRippleClient must be used within a RippleProvider')
  }
  return client
}

// ─────────────────────────────────────────────────────────────
// Connection Hook
// ─────────────────────────────────────────────────────────────

/**
 * Hook to manage Ripple connection
 *
 * @example
 * ```tsx
 * function App() {
 *   const { state, connect, disconnect } = useRipple({
 *     host: 'ws://localhost:3000/ws',
 *   })
 *
 *   useEffect(() => {
 *     connect()
 *     return () => disconnect()
 *   }, [])
 *
 *   return <div>Connection: {state}</div>
 * }
 * ```
 */
export function useRipple(config: RippleClientConfig) {
  const [client] = useState(() => new RippleClient(config))
  const [state, setState] = useState<ConnectionState>('disconnected')

  const connect = async () => {
    try {
      await client.connect()
      setState('connected')
    } catch {
      setState('disconnected')
    }
  }

  const disconnect = () => {
    client.disconnect()
    setState('disconnected')
  }

  return { client, state, connect, disconnect }
}

// ─────────────────────────────────────────────────────────────
// Channel Hook
// ─────────────────────────────────────────────────────────────

/**
 * Hook to subscribe to a channel
 *
 * @example
 * ```tsx
 * function NewsFeed() {
 *   const { data } = useChannel('news', 'ArticlePublished')
 *
 *   return <div>{data?.title}</div>
 * }
 * ```
 */
export function useChannel<T = unknown>(
  channelName: string,
  eventName: string
): { channel: Channel | null; data: T | null } {
  const client = useRippleClient()
  const [channel, setChannel] = useState<Channel | null>(null)
  const [data, setData] = useState<T | null>(null)

  useEffect(() => {
    const ch = client.channel(channelName)
    setChannel(ch)

    ch.listen<T>(eventName, (eventData) => {
      setData(eventData)
    })

    return () => {
      client.leave(channelName)
    }
  }, [client, channelName, eventName])

  return { channel, data }
}

/**
 * Hook to subscribe to a private channel
 */
export function usePrivateChannel<T = unknown>(
  channelName: string,
  eventName: string
): { channel: PrivateChannel | null; data: T | null } {
  const client = useRippleClient()
  const [channel, setChannel] = useState<PrivateChannel | null>(null)
  const [data, setData] = useState<T | null>(null)

  useEffect(() => {
    const ch = client.private(channelName)
    setChannel(ch)

    ch.listen<T>(eventName, (eventData) => {
      setData(eventData)
    })

    return () => {
      client.leave(channelName)
    }
  }, [client, channelName, eventName])

  return { channel, data }
}

// ─────────────────────────────────────────────────────────────
// Presence Hook
// ─────────────────────────────────────────────────────────────

/**
 * Hook to join a presence channel
 *
 * @example
 * ```tsx
 * function ChatRoom() {
 *   const { members } = usePresence('chat.lobby')
 *
 *   return (
 *     <ul>
 *       {members.map((user) => (
 *         <li key={user.id}>{user.info.name}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function usePresence(channelName: string): {
  channel: PresenceChannel | null
  members: PresenceUser[]
} {
  const client = useRippleClient()
  const [channel, setChannel] = useState<PresenceChannel | null>(null)
  const [members, setMembers] = useState<PresenceUser[]>([])

  useEffect(() => {
    const ch = client.join(channelName)
    setChannel(ch)

    ch.here((users) => setMembers(users))
    ch.joining((user) => setMembers((prev: PresenceUser[]) => [...prev, user]))
    ch.leaving((user) =>
      setMembers((prev: PresenceUser[]) => prev.filter((m: PresenceUser) => m.id !== user.id))
    )

    return () => {
      client.leave(channelName)
    }
  }, [client, channelName])

  return { channel, members }
}
