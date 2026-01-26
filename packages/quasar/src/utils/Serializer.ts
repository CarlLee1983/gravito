import { pack, unpack } from 'msgpackr'

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
    if (!str) return null
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

export const defaultSerializer = new JsonSerializer()
