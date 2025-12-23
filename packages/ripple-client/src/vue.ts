/**
 * @fileoverview Vue composables for @gravito/ripple-client
 * @module @gravito/ripple-client/vue
 */

import { type InjectionKey, inject, onMounted, onUnmounted, provide, type Ref, ref } from 'vue'
import type { Channel, PresenceChannel, PrivateChannel } from './Channel'
import { type ConnectionState, RippleClient } from './RippleClient'
import type { PresenceUser, RippleClientConfig } from './types'

// ─────────────────────────────────────────────────────────────
// Injection Key
// ─────────────────────────────────────────────────────────────

export const RippleKey: InjectionKey<RippleClient> = Symbol('ripple')

/**
 * Provide Ripple client to descendant components
 */
export function provideRipple(client: RippleClient): void {
  provide(RippleKey, client)
}

/**
 * Inject Ripple client from ancestor component
 */
export function useRippleClient(): RippleClient {
  const client = inject(RippleKey)
  if (!client) {
    throw new Error('useRippleClient must be used within a component that provides Ripple')
  }
  return client
}

// ─────────────────────────────────────────────────────────────
// Connection Composable
// ─────────────────────────────────────────────────────────────

/**
 * Composable to manage Ripple connection
 *
 * @example
 * ```vue
 * <script setup>
 * const { client, state, connect, disconnect } = useRipple({
 *   host: 'ws://localhost:3000/ws',
 * })
 *
 * onMounted(() => connect())
 * onUnmounted(() => disconnect())
 * </script>
 *
 * <template>
 *   <div>Connection: {{ state }}</div>
 * </template>
 * ```
 */
export function useRipple(config: RippleClientConfig) {
  const client = new RippleClient(config)
  const state = ref<ConnectionState>('disconnected')

  const connect = async () => {
    try {
      await client.connect()
      state.value = 'connected'
    } catch {
      state.value = 'disconnected'
    }
  }

  const disconnect = () => {
    client.disconnect()
    state.value = 'disconnected'
  }

  return { client, state, connect, disconnect }
}

// ─────────────────────────────────────────────────────────────
// Channel Composable
// ─────────────────────────────────────────────────────────────

/**
 * Composable to subscribe to a channel
 *
 * @example
 * ```vue
 * <script setup>
 * const { data } = useChannel('news', 'ArticlePublished')
 * </script>
 *
 * <template>
 *   <div>{{ data?.title }}</div>
 * </template>
 * ```
 */
export function useChannel<T = unknown>(
  channelName: string,
  eventName: string
): { channel: Ref<Channel | null>; data: Ref<T | null> } {
  const client = useRippleClient()
  const channel = ref<Channel | null>(null) as Ref<Channel | null>
  const data = ref<T | null>(null) as Ref<T | null>

  onMounted(() => {
    const ch = client.channel(channelName)
    channel.value = ch

    ch.listen<T>(eventName, (eventData) => {
      data.value = eventData
    })
  })

  onUnmounted(() => {
    client.leave(channelName)
  })

  return { channel, data }
}

/**
 * Composable to subscribe to a private channel
 */
export function usePrivateChannel<T = unknown>(
  channelName: string,
  eventName: string
): { channel: Ref<PrivateChannel | null>; data: Ref<T | null> } {
  const client = useRippleClient()
  const channel = ref<PrivateChannel | null>(null) as Ref<PrivateChannel | null>
  const data = ref<T | null>(null) as Ref<T | null>

  onMounted(() => {
    const ch = client.private(channelName)
    channel.value = ch

    ch.listen<T>(eventName, (eventData) => {
      data.value = eventData
    })
  })

  onUnmounted(() => {
    client.leave(channelName)
  })

  return { channel, data }
}

// ─────────────────────────────────────────────────────────────
// Presence Composable
// ─────────────────────────────────────────────────────────────

/**
 * Composable to join a presence channel
 *
 * @example
 * ```vue
 * <script setup>
 * const { members } = usePresence('chat.lobby')
 * </script>
 *
 * <template>
 *   <ul>
 *     <li v-for="user in members" :key="user.id">
 *       {{ user.info.name }}
 *     </li>
 *   </ul>
 * </template>
 * ```
 */
export function usePresence(channelName: string): {
  channel: Ref<PresenceChannel | null>
  members: Ref<PresenceUser[]>
} {
  const client = useRippleClient()
  const channel = ref<PresenceChannel | null>(null) as Ref<PresenceChannel | null>
  const members = ref<PresenceUser[]>([])

  onMounted(() => {
    const ch = client.join(channelName)
    channel.value = ch

    ch.here((users) => {
      members.value = users
    })
    ch.joining((user) => {
      members.value = [...members.value, user]
    })
    ch.leaving((user) => {
      members.value = members.value.filter((m) => m.id !== user.id)
    })
  })

  onUnmounted(() => {
    client.leave(channelName)
  })

  return { channel, members }
}
