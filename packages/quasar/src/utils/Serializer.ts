import { decode, encode } from 'cborg'
import { pack, unpack } from 'msgpackr'
import * as protobuf from 'protobufjs'

export interface Serializer {
  serialize(data: any): string | Buffer
  deserialize(data: string | Buffer): any
  contentType: string
}

export class JsonSerializer implements Serializer {
  serialize(data: any): string {
    return JSON.stringify(data)
  }

  deserialize(data: string | Buffer): any {
    const str = typeof data === 'string' ? data : data.toString()
    if (!str) {
      return null
    }
    return JSON.parse(str)
  }

  contentType = 'application/json'
}

export class MsgPackSerializer implements Serializer {
  serialize(data: any): Buffer {
    return pack(data)
  }

  deserialize(data: string | Buffer): any {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data)
      } catch {
        return data
      }
    }
    return unpack(data)
  }

  contentType = 'application/x-msgpack'
}

export class CborSerializer implements Serializer {
  serialize(data: any): Buffer {
    return Buffer.from(encode(data))
  }

  deserialize(data: string | Buffer): any {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data)
      } catch {
        return data
      }
    }
    return decode(data)
  }

  contentType = 'application/cbor'
}

export class ProtobufSerializer implements Serializer {
  private type: protobuf.Type

  constructor() {
    const root = protobuf.Root.fromJSON({
      nested: {
        ZenithLog: {
          fields: {
            level: { type: 'string', id: 1 },
            message: { type: 'string', id: 2 },
            jobId: { type: 'string', id: 3 },
            workerId: { type: 'string', id: 4 },
            timestamp: { type: 'string', id: 5 },
            traceId: { type: 'string', id: 6 },
            spanId: { type: 'string', id: 7 },
            parentSpanId: { type: 'string', id: 8 },
            context: { type: 'string', id: 9 },
          },
        },
      },
    })
    this.type = root.lookupType('ZenithLog')
  }

  serialize(data: any): Buffer {
    const payload = { ...data }
    if (payload.context && typeof payload.context === 'object') {
      payload.context = JSON.stringify(payload.context)
    }
    const message = this.type.create(payload)
    return Buffer.from(this.type.encode(message).finish())
  }

  deserialize(data: string | Buffer): any {
    const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data
    const message = this.type.decode(buffer)
    const obj = this.type.toObject(message, {
      defaults: true,
      arrays: true,
      objects: true,
      oneofs: true,
    }) as any

    if (obj.context) {
      try {
        obj.context = JSON.parse(obj.context)
      } catch {}
    }
    return obj
  }

  contentType = 'application/x-protobuf'
}

export const defaultSerializer = new JsonSerializer()
