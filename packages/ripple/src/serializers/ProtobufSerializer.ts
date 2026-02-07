import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ClientMessage, ServerMessage } from '../types'
import type { ISerializer } from './ISerializer'

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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

  constructor(private options: { protoPath?: string; pure?: boolean } = {}) {
    if (!options.protoPath) {
      this.options.protoPath = this.resolveProtoPath()
    }
  }

  /**
   * Resolves the proto file path using a multi-level fallback strategy.
   *
   * Search order:
   * 1. Relative to current file (ESM: import.meta.url)
   * 2. From cwd as package root (common in test environments)
   * 3. From cwd as monorepo root
   */
  private resolveProtoPath(): string {
    const candidatePaths = [
      // 1. 相對於當前檔案（開發環境：src/serializers -> ../proto）
      join(__dirname, '../proto/ripple.proto'),

      // 2. 相對於當前檔案，但在 dist 構建後（dist/serializers -> ../../src/proto）
      join(__dirname, '../../src/proto/ripple.proto'),

      // 3. 從 cwd 作為 package 根目錄（測試環境常見）
      join(process.cwd(), 'src/proto/ripple.proto'),
      join(process.cwd(), 'proto/ripple.proto'),
      join(process.cwd(), 'dist/proto/ripple.proto'),

      // 4. 從 cwd 作為 monorepo 根目錄
      join(process.cwd(), 'packages/ripple/src/proto/ripple.proto'),
      join(process.cwd(), 'packages/ripple/dist/proto/ripple.proto'),
    ]

    for (const candidatePath of candidatePaths) {
      const resolvedPath = resolve(candidatePath)
      if (existsSync(resolvedPath)) {
        return resolvedPath
      }
    }

    // 沒找到時返回預設路徑（讓後續的 init() 顯示詳細錯誤）
    return join(__dirname, '../proto/ripple.proto')
  }

  /**
   * Initialize the serializer by loading the .proto file
   */
  async init(): Promise<void> {
    if (this.initialized) return

    try {
      // 先檢查文件是否存在
      if (!existsSync(this.options.protoPath!)) {
        throw new Error(
          `Proto file not found at: ${this.options.protoPath}\n` +
            `Working directory: ${process.cwd()}\n` +
            `Please ensure ripple.proto exists or provide a custom protoPath.`
        )
      }

      let protobuf: any
      try {
        protobuf = await import('protobufjs')
      } catch (_importError) {
        throw new Error(
          `'protobufjs' is not installed.\n` +
            `Install it with: npm install protobufjs\n` +
            `Or use JSON serializer instead: new RippleServer({ serializer: 'json' })`
        )
      }

      protoRoot = await protobuf.load(this.options.protoPath!)
      ClientMessageProto = protoRoot.lookupType('ripple.ClientMessage')
      ServerMessageProto = protoRoot.lookupType('ripple.ServerMessage')
      this.initialized = true
    } catch (error) {
      throw new Error(
        `Failed to initialize ProtobufSerializer: ${(error as Error).message}\n` +
          `Proto path attempted: ${this.options.protoPath}\n` +
          `Ensure 'protobufjs' is installed or switch to JSON serializer.`
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

  deserialize(data: string | Buffer | ArrayBuffer | Uint8Array): ClientMessage {
    this.checkInitialized()

    const buffer =
      data instanceof ArrayBuffer ? new Uint8Array(data) : (data as Buffer | Uint8Array)
    const decoded = ClientMessageProto.decode(buffer)
    const obj = ClientMessageProto.toObject(decoded, {
      enums: String,
      longs: String,
      bytes: this.options.pure ? undefined : String,
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
      const auth = obj.subscribe.auth
      // Note: protobufjs converts snake_case to camelCase automatically
      return {
        type: 'subscribe',
        channel: obj.subscribe.channel,
        auth: auth
          ? {
              socketId: auth.socketId || '',
              signature: auth.signature || '',
            }
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
    if (this.options.pure) {
      if (data instanceof Uint8Array) return data
      if (Object.prototype.toString.call(data) === '[object Uint8Array]') return data as Uint8Array
      if (Buffer.isBuffer(data)) return data
      throw new Error('In pure mode, data must be Uint8Array or Buffer')
    }

    // In Hybrid mode, we put JSON string into bytes field for now
    // This is the "Envelope" strategy from RFC
    if (typeof data === 'string') return new TextEncoder().encode(data)
    if (data instanceof Uint8Array) return data
    return new TextEncoder().encode(JSON.stringify(data))
  }

  private decodeData(data: Uint8Array | string | Buffer): unknown {
    if (this.options.pure) {
      return data
    }

    if (typeof data === 'string') {
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
