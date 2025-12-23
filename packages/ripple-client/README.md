# @gravito/ripple-client

> 🌊 Frontend WebSocket client for @gravito/ripple. Works with React, Vue, and vanilla JavaScript.

## Features

- **Framework Agnostic** - Works with any JavaScript frontend
- **React Hooks** - `useChannel`, `usePresence`, `usePrivateChannel`
- **Vue Composables** - Same API patterns for Vue 3
- **Auto Reconnect** - Handles disconnections gracefully
- **TypeScript First** - Full type safety

## Installation

```bash
bun add @gravito/ripple-client
```

## Quick Start

### Vanilla JavaScript

```typescript
import { createRippleClient } from '@gravito/ripple-client'

const client = createRippleClient({
  host: 'ws://localhost:3000/ws',
  authEndpoint: '/broadcasting/auth',
})

await client.connect()

// Subscribe to public channel
client.channel('news')
  .listen('ArticlePublished', (data) => {
    console.log('New article:', data.title)
  })

// Subscribe to private channel
client.private('orders.123')
  .listen('OrderShipped', (data) => {
    console.log('Order shipped!')
  })

// Join presence channel
client.join('chat.lobby')
  .here((users) => console.log('Online:', users))
  .joining((user) => console.log(`${user.info.name} joined`))
  .leaving((user) => console.log(`${user.info.name} left`))
```

### React

```tsx
import { RippleProvider, useRipple, useChannel, usePresence } from '@gravito/ripple-client/react'

// Setup provider
function App() {
  const { client, state, connect, disconnect } = useRipple({
    host: 'ws://localhost:3000/ws',
  })

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [])

  return (
    <RippleProvider client={client}>
      <NewsFeed />
      <ChatRoom />
    </RippleProvider>
  )
}

// Subscribe to channel
function NewsFeed() {
  const { data } = useChannel<{ title: string }>('news', 'ArticlePublished')

  return <div>{data?.title}</div>
}

// Join presence channel
function ChatRoom() {
  const { members } = usePresence('chat.lobby')

  return (
    <ul>
      {members.map((user) => (
        <li key={user.id}>{user.info.name}</li>
      ))}
    </ul>
  )
}
```

### Vue 3

```vue
<script setup>
import { useRipple, useChannel, usePresence, provideRipple } from '@gravito/ripple-client/vue'

// Setup connection
const { client, state, connect, disconnect } = useRipple({
  host: 'ws://localhost:3000/ws',
})

// Provide to descendants
provideRipple(client)

onMounted(() => connect())
onUnmounted(() => disconnect())

// Subscribe to channel
const { data: article } = useChannel('news', 'ArticlePublished')

// Join presence
const { members } = usePresence('chat.lobby')
</script>

<template>
  <div>
    <h2>{{ article?.title }}</h2>
    <ul>
      <li v-for="user in members" :key="user.id">
        {{ user.info.name }}
      </li>
    </ul>
  </div>
</template>
```

## API Reference

### `createRippleClient(config)`

Create a new Ripple client instance.

```typescript
interface RippleClientConfig {
  host: string                    // WebSocket server URL
  authEndpoint?: string           // Auth endpoint (default: '/broadcasting/auth')
  authHeaders?: Record<string, string>  // Extra headers for auth
  autoReconnect?: boolean         // Auto reconnect (default: true)
  reconnectDelay?: number         // Reconnect delay ms (default: 1000)
  maxReconnectAttempts?: number   // Max attempts (default: 10)
}
```

### `client.channel(name)`

Subscribe to a public channel.

### `client.private(name)`

Subscribe to a private channel (requires auth).

### `client.join(name)`

Join a presence channel (requires auth, tracks members).

### `client.leave(name)`

Leave a channel.

### `client.disconnect()`

Disconnect from the server.

## License

MIT
