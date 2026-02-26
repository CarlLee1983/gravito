# TCP Protocol Design Guide

When standard HTTP/Beam isn't enough, `@gravito/quark` allows you to design specialized binary or text-based protocols for extreme performance.

## 1. Choosing a Framing Strategy

TCP is a stream-oriented protocol. Without a "Frame", the receiver doesn't know where one message ends and the next begins.

### A. Length-Prefixed (Recommended)
Add a 4-byte header at the start of every message indicating the body size. This is fast and reliable.

```typescript
import { FrameProtocol } from '@gravito/quark'

const protocol = new FrameProtocol({ headerSize: 4 })
const message = protocol.encode('My Secret Data')
// Output: [0x00 0x00 0x00 0x0E] + payload
```

### B. Delimiter-Based
End every message with a specific character (e.g., `
` or `\0`). Simple, but risky if the data contains the delimiter.

```typescript
import { LineProtocol } from '@gravito/quark'

const protocol = new LineProtocol({ delimiter: '
' })
const message = protocol.encode('Ping')
// Output: Ping

```

## 2. Designing Inter-Satellite Synapses

If Satellite A and Satellite B need to sync massive amounts of data (e.g., Cache replication), use a Quark Synapse.

```typescript
// Satellite A (Replicator)
const server = new TcpServer({ port: 9000 })
server.onConnection(conn => {
  // Use a custom Binary protocol for speed
  conn.on('message', data => syncToMemory(data))
})

// Satellite B (Source)
const client = new TcpClient({ port: 9000 })
const conn = await client.connect()
conn.send(serializeState(myState))
```

## 3. Backpressure & Memory Safety

Never ignore the return value of `send()`. If it returns `false`, the kernel buffer is full.

```typescript
const success = conn.send(hugePayload)
if (!success) {
  // Pause reading from source until 'drain'
  source.pause()
  conn.on('drain', () => source.resume())
}
```

## 4. Zero-Copy Performance

When possible, use `Uint8Array` views instead of copying data. `@gravito/quark` is designed to pass these buffers directly to `Bun.write()`.

```typescript
// Fast path: pass the original buffer view
const subView = rawData.subarray(0, 1024)
conn.send(subView)
```

## 5. Security: Boundary Protection

Since TCP doesn't have built-in headers like HTTP, you must handle authentication at the protocol level.

- **Handshake**: The first message from a client must be a signed token.
- **Whitelist**: Restrict TCP server access to the internal network CIDR using standard OS firewalls or `TcpServer` logic.
- **Max Frame Size**: Always set a `maxFrameSize` to prevent OOM attacks.
