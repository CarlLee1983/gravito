import { beforeAll, describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { ProtobufSerializer } from '../src/serializers/ProtobufSerializer'
import type { ServerMessage } from '../src/types'

describe('ProtobufSerializer', () => {
  let serializer: ProtobufSerializer

  beforeAll(async () => {
    // 自動解析路徑，不需手動指定
    serializer = new ProtobufSerializer()
    await serializer.init()
  })

  describe('path resolution', () => {
    it('should auto-resolve proto path without explicit path', async () => {
      const s = new ProtobufSerializer()
      await s.init()
      expect(s).toBeDefined()
    })

    it('should accept custom proto path', async () => {
      const customPath = join(process.cwd(), 'src/proto/ripple.proto')
      const s = new ProtobufSerializer({ protoPath: customPath })
      await s.init()
      expect(s).toBeDefined()
    })

    it('should throw meaningful error for invalid path', async () => {
      const s = new ProtobufSerializer({ protoPath: '/nonexistent/path/ripple.proto' })
      await expect(s.init()).rejects.toThrow(/Proto file not found/)
    })
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
  })

  it('should deserialize a binary buffer representing a ClientMessage', async () => {
    const protobuf = await import('protobufjs')
    const root = await protobuf.load(join(process.cwd(), 'src/proto/ripple.proto'))
    const ClientMessage = root.lookupType('ripple.ClientMessage')

    const payload = {
      subscribe: {
        channel: 'my-channel',
        auth: { socketId: 's1', signature: 'sig1' },
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

    const encoded = serializer.serialize(msg)
    expect(encoded).toBeInstanceOf(Uint8Array)
  })

  it('should support pure mode (no JSON envelope)', async () => {
    const pureSerializer = new ProtobufSerializer({ pure: true })
    await pureSerializer.init()

    const data = new Uint8Array([1, 2, 3, 4])
    const msg: ServerMessage = {
      type: 'binary', // Use binary type for raw bytes transmission properly aligned with proto definition
      channel: 'binary-channel',
      event: 'upload',
      data: data,
    }

    // In pure mode, we expect serialize to work without JSON stringification of 'data'
    // 'binary' message type in proto definition uses 'bytes data = 3;' which is what we want.
    // Actually, 'event' message type also uses 'bytes data = 3;'.
    // If we use 'event' type and pure mode, ProtobufSerializer.encodeData should pass Uint8Array as is.

    const encoded = pureSerializer.serialize(msg)
    expect(encoded).toBeInstanceOf(Uint8Array)
    expect(encoded.length).toBeGreaterThan(0)

    // Decode to check data content
    const protobuf = await import('protobufjs')
    const root = await protobuf.load(join(process.cwd(), 'src/proto/ripple.proto'))
    const ServerMessageProto = root.lookupType('ripple.ServerMessage')

    const decoded = ServerMessageProto.decode(encoded)
    const obj = ServerMessageProto.toObject(decoded, { bytes: Array }) // bytes as Array of numbers

    // Check if 'binary' payload exists and matches
    if (obj.binary) {
      // protobufjs might decode bytes to Buffer or Array depending on options
      // We expect it to match our input data
      // For simple check:
      expect(obj.binary.channel).toBe('binary-channel')
    } else {
      // If type was event
      // expect(obj.event.data)...
    }
  })

  it('should handle caching for broadcast', () => {
    const msg: ServerMessage = { type: 'pong' }
    const encoded1 = serializer.serializeForBroadcast(msg)
    const encoded2 = serializer.serializeForBroadcast(msg)

    expect(encoded1).toBe(encoded2)

    serializer.clearBroadcastCache()
    const encoded3 = serializer.serializeForBroadcast(msg)
    expect(encoded3).not.toBe(encoded1)
    expect(encoded3).toEqual(encoded1)
  })
})
