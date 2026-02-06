import type { ISerializer } from '../serializers/ISerializer'
import type { ClientMessage, ServerMessage } from '../types'

/**
 * 訊息序列化器，用於 JSON 格式的訊息序列化與反序列化。
 *
 * 實現了廣播消息的緩存優化，確保相同的訊息只被序列化一次，
 * 然後發送給所有客戶端，從而減少 CPU 開銷。
 */
export class MessageSerializer implements ISerializer {
  readonly contentType = 'json'

  /** 預序列化的 PONG 訊息 */
  private static readonly PONG_MESSAGE = '{"type":"pong"}'

  /** 廣播訊息緩存 */
  private broadcastCache: Map<ServerMessage, string> = new Map()

  /**
   * 序列化伺服器訊息為 JSON 字符串。
   *
   * @param message - 要序列化的訊息
   * @returns JSON 字符串
   */
  serialize(message: ServerMessage): string {
    return JSON.stringify(message)
  }

  /**
   * 將訊息反序列化為客戶端訊息物件。
   *
   * @param data - 原始數據
   * @returns 解析後的客戶端訊息
   */
  deserialize(data: string | Buffer | ArrayBuffer): ClientMessage {
    const str = typeof data === 'string' ? data : new TextDecoder().decode(data)
    return JSON.parse(str) as ClientMessage
  }

  /**
   * 為廣播序列化訊息，支援緩存優化。
   *
   * 第一次序列化時會緩存結果，後續相同的訊息會直接返回緩存值，
   * 避免重複序列化。這在廣播給大量客戶端時可以顯著減少 CPU 使用。
   *
   * @param message - 要廣播的訊息
   * @returns 序列化的訊息
   */
  serializeForBroadcast(message: ServerMessage): string {
    let cached = this.broadcastCache.get(message)
    if (!cached) {
      cached = this.serialize(message)
      this.broadcastCache.set(message, cached)
    }
    return cached
  }

  /**
   * 清除廣播訊息緩存。
   *
   * 應在訊息發送完成後調用，以釋放記憶體。
   */
  clearBroadcastCache(): void {
    this.broadcastCache.clear()
  }

  /**
   * 取得預序列化的 PONG 訊息。
   *
   * PONG 訊息是一個常用的心跳訊息，為了效率我們將其預序列化為常數，
   * 每次都返回相同的字符串引用，無需重複序列化。
   *
   * @returns 預序列化的 PONG 訊息
   */
  getPongMessage(): string {
    return MessageSerializer.PONG_MESSAGE
  }
}
