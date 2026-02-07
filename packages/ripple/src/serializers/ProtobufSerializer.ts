import { join } from 'path'
import { fileURLToPath } from 'url'
import type { ClientMessage, ServerMessage } from '../types'
import type { ISerializer } from './ISerializer'

// We use dynamic import for protobufjs to avoid hard dependency if not used
// This allows the package to be used without protobufjs if only JSON is needed
let protoRoot: any = null
let ClientMessageProto: any = null
let ServerMessageProto: any = null

/**
 * Protobuf Serializer implementation.
 *
 * Uses 'ripple.proto' to serialize messages.
 * Requires 'protobufjs' to be installed.
 */
export class ProtobufSerializer implements ISerializer {
  readonly contentType = 'protobuf'

  private broadcastCache: Uint8Array | null = null
  private initialized = false

  constructor(private protoPath?: string) {
    if (!protoPath) {
      // Default path assuming standard structure
      // Try relative to __dirname first (serializers directory)
      this.protoPath = join(__dirname, '../proto/ripple.proto')
    }
  }

  /**
   * Initialize the serializer by loading the .proto file
   */
  async init(): Promise<void> {
    if (this.initialized) return

    try {
      const protobuf = await import('protobufjs')
      protoRoot = await protobuf.load(this.protoPath!)
      ClientMessageProto = protoRoot.lookupType('ripple.ClientMessage')
      ServerMessageProto = protoRoot.lookupType('ripple.ServerMessage')
      this.initialized = true
    } catch (error) {
      throw new Error(
        `Failed to initialize ProtobufSerializer: ${(error as Error).message}. Ensure 'protobufjs' is installed.`
      )
    }
  }

  serialize(message: ServerMessage): Uint8Array {
    this.checkInitialized()

    // Convert generic message to Proto-compatible payload
    const payload = this.toProtoPayload(message)
    const errMsg = ServerMessageProto.verify(payload)
    if (errMsg) throw Error(errMsg)

    const msg = ServerMessageProto.create(payload)
    return ServerMessageProto.encode(msg).finish()
  }

  deserialize(data: string | Buffer | ArrayBuffer): ClientMessage {
    this.checkInitialized()

    const buffer =
      data instanceof ArrayBuffer ? new Uint8Array(data) : (data as Buffer | Uint8Array)
    const decoded = ClientMessageProto.decode(buffer)
    const obj = ClientMessageProto.toObject(decoded, {
      enums: String,
      longs: String,
      bytes: String,
      defaults: true,
      oneofs: true,
    })

    return this.fromProtoPayload(obj)
  }

  serializeForBroadcast(message: ServerMessage): Uint8Array {
    if (!this.broadcastCache) {
      this.broadcastCache = this.serialize(message)
    }
    return this.broadcastCache
  }

  clearBroadcastCache(): void {
    this.broadcastCache = null
  }

  getPongMessage(): Uint8Array {
    this.checkInitialized()
    const payload = { pong: {} }
    const msg = ServerMessageProto.create(payload)
    return ServerMessageProto.encode(msg).finish()
  }

  private checkInitialized() {
    if (!this.initialized) {
      throw new Error('ProtobufSerializer not initialized. Call init() first.')
    }
  }

  private toProtoPayload(msg: ServerMessage): any {
    // Map internal ServerMessage union types to Proto oneof structure
    switch (msg.type) {
      case 'connected':
        return { connected: { socket_id: msg.socketId } }
      case 'subscribed':
        return { subscribed: { channel: msg.channel } }
      case 'unsubscribed':
        return { unsubscribed: { channel: msg.channel } }
      case 'pong':
        return { pong: {} }
      case 'ack_received':
        return { ack_received: { seq: msg.seq } }
      case 'reconnection_token':
        return { reconnection_token: { token: msg.token } }
      case 'error':
        return {
          error: { code: msg.code || 'UNKNOWN', message: msg.message, channel: msg.channel },
        }
      case 'event':
        return {
          event: {
            channel: msg.channel,
            event: msg.event,
            data: this.encodeData(msg.data),
            seq: msg.seq,
            need_ack: msg.needAck,
          },
        }
      case 'presence':
        return {
          presence: {
            channel: msg.channel,
            event: msg.event,
            data: this.encodeData(msg.data),
          },
        }
      case 'binary':
        return {
          binary: {
            channel: msg.channel,
            event: msg.event,
            data: msg.data instanceof ArrayBuffer ? new Uint8Array(msg.data) : msg.data,
          },
        }
    }
    throw new Error(`Unknown server message type: ${(msg as any).type}`)
  }

  private fromProtoPayload(obj: any): ClientMessage {
    // oneof field name is usually the key in `obj`
    if (obj.subscribe) {
      return {
        type: 'subscribe',
        channel: obj.subscribe.channel,
        auth: obj.subscribe.auth
          ? { socketId: obj.subscribe.auth.socket_id, signature: obj.subscribe.auth.signature }
          : undefined,
      }
    }
    if (obj.unsubscribe) return { type: 'unsubscribe', channel: obj.unsubscribe.channel }
    if (obj.whisper) {
      return {
        type: 'whisper',
        channel: obj.whisper.channel,
        event: obj.whisper.event,
        data: this.decodeData(obj.whisper.data),
      }
    }
    if (obj.ping) return { type: 'ping' }
    if (obj.ack) return { type: 'ack', seq: obj.ack.seq }
    if (obj.binary) {
      return {
        type: 'binary',
        channel: obj.binary.channel,
        event: obj.binary.event,
        data: obj.binary.data, // keep as is (buffer/bytes)
      }
    }

    throw new Error('Unknown client message payload')
  }

  private encodeData(data: unknown): Uint8Array {
    // In Hybrid mode, we put JSON string into bytes field for now
    // This is the "Envelope" strategy from RFC
    if (typeof data === 'string') return new TextEncoder().encode(data)
    if (data instanceof Uint8Array) return data
    return new TextEncoder().encode(JSON.stringify(data))
  }

  private decodeData(data: Uint8Array | string): unknown {
    if (typeof data === 'string') {
      // protobufjs might return base64 string for bytes if configured to String
      // but we used bytes: String option? No, usually Bytes is Buffer/Uint8Array
      // Let's assume it handles it.
      try {
        return JSON.parse(atob(data))
      } catch {
        return data
      }
    }
    try {
      const str = new TextDecoder().decode(data)
      return JSON.parse(str)
    } catch {
      return data
    }
  }
}
