/**
 * WebSocket 路由管理器
 *
 * 負責註冊和分發 WebSocket 事件到相應的路由處理器
 */
export interface WebSocketRouteHandlers {
  open?: (ws: unknown) => void | Promise<void>
  message?: (ws: unknown, data: string | Buffer | Uint8Array) => void | Promise<void>
  close?: (ws: unknown, code: number, reason: string) => void | Promise<void>
  drain?: (ws: unknown) => void | Promise<void>
}
export declare class BunWebSocketHandler {
  private routes
  /**
   * 註冊 WebSocket 路由
   */
  register(path: string, handlers: WebSocketRouteHandlers): void
  /**
   * 檢查是否有該路由
   * 支援精確匹配和 wildcard 匹配
   */
  hasRoute(path: string): boolean
  /**
   * 檢查是否有任何已註冊的路由
   */
  hasAnyRoute(): boolean
  /**
   * 將 handlers 轉換為 Bun.serve websocket config
   */
  toHandler(): {
    open?: (ws: unknown) => void | Promise<void>
    message?: (ws: unknown, data: string | Buffer | Uint8Array) => void | Promise<void>
    close?: (ws: unknown, code: number, reason: string) => void | Promise<void>
    drain?: (ws: unknown) => void | Promise<void>
  }
  /**
   * 尋找符合路徑的 handler
   * 優先精確匹配，再 wildcard 匹配
   */
  private findHandler
  /**
   * 路徑匹配邏輯
   * 支援：
   * - 精確匹配：/chat
   * - Wildcard：/api/*, /api*
   */
  private matchesPath
}
