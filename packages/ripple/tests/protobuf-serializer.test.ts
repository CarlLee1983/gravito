import { beforeAll, describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { ProtobufSerializer } from '../src/serializers/ProtobufSerializer'
import type { ServerMessage } from '../src/types'

describe('ProtobufSerializer', () => {
  let serializer: ProtobufSerializer

  beforeAll(async () => {
    // Use relative path from current working directory
    // When running tests, cwd is usually the package root
    const protoPath = join(process.cwd(), 'src/proto/ripple.proto')
    serializer = new ProtobufSerializer(protoPath)
    await serializer.init()
  })

  it('should serialize and deserialize a simple event message', () => {
    const msg: ServerMessage = {
      type: 'event',
      channel: 'test-channel',
      event: 'user.created',
      data: { id: 123, name: 'Alice' },
      seq: 1,
      needAck: true,
    }

    const encoded = serializer.serialize(msg)
    expect(encoded).toBeInstanceOf(Uint8Array)
    expect(encoded.length).toBeGreaterThan(0)

    // Deserialize back to ClientMessage?
    // Wait, ServerMessage (Server->Client) is what we serialize.
    // But deserialize() handles ClientMessage (Client->Server).
    // The serialize() test should verify we can encode ServerMessage.
    // The deserialize() test should verify we can decode ClientMessage.

    // Let's test deserialize (Client -> Server)
    // We need to construct a valid protobuf buffer effectively mocking a client request.
    // But we don't have a ClientSerializer for testing here easily unless we use the same class
    // or manually construct it using protobufjs in the test.
  })

  it('should deserialize a binary buffer representing a ClientMessage', async () => {
    // We can use the same serializer class internals to encode a ClientMessage
    // if we expose a helper or just use protobufjs directly here to mock a client.

    // Re-import protobufjs to mock client behavior
    const protobuf = await import('protobufjs')
    const root = await protobuf.load(join(process.cwd(), 'packages/ripple/src/proto/ripple.proto'))
    const ClientMessage = root.lookupType('ripple.ClientMessage')

    const payload = {
      subscribe: {
        channel: 'my-channel',
        auth: { socket_id: 's1', signature: 'sig1' },
      },
    }
    const errMsg = ClientMessage.verify(payload)
    expect(errMsg).toBeNull()

    const msg = ClientMessage.create(payload)
    const buffer = ClientMessage.encode(msg).finish()

    const decoded = serializer.deserialize(buffer)
    expect(decoded.type).toBe('subscribe')
    if (decoded.type === 'subscribe') {
      expect(decoded.channel).toBe('my-channel')
      expect(decoded.auth?.socketId).toBe('s1')
      expect(decoded.auth?.signature).toBe('sig1')
    }
  })

  it('should serialize an event with complex data', () => {
    const msg: ServerMessage = {
      type: 'event',
      channel: 'chat',
      event: 'message',
      data: {
        user: { id: 1, name: 'Bob' },
        text: 'Hello World',
        tags: ['a', 'b'],
      },
    }

    const _encoded = serializer.serialize(msg)

    // We can decode this back using protobufjs to verify content
    // But ServerMessage in proto has `bytes data`.
    // The serializer implementation stringifies JSON into that bytes field.
  })

  it('should handling caching for broadcast', () => {
    const msg: ServerMessage = { type: 'pong' }
    const encoded1 = serializer.serializeForBroadcast(msg)
    const encoded2 = serializer.serializeForBroadcast(msg)

    // Should be reference equal if cached (ProtobufSerializer implementation caches the Uint8Array)
    expect(encoded1).toBe(encoded2)

    serializer.clearBroadcastCache()
    const encoded3 = serializer.serializeForBroadcast(msg)
    expect(encoded3).not.toBe(encoded1) // New instance
    expect(encoded3).toEqual(encoded1) // Same content
  })
})
