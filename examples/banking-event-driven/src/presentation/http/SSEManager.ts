/**
 * SSEManager - 管理 Server-Sent Events 客戶端連接
 */
export class SSEManager {
  private readonly clients = new Set<ReadableStreamDefaultController>()

  registerClient(controller: ReadableStreamDefaultController): void {
    this.clients.add(controller)
  }

  unregisterClient(controller: ReadableStreamDefaultController): void {
    this.clients.delete(controller)
  }

  broadcast(eventType: string, data: unknown): void {
    const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
    const encoder = new TextEncoder()
    const encoded = encoder.encode(message)

    for (const controller of this.clients) {
      try {
        controller.enqueue(encoded)
      } catch {
        this.clients.delete(controller)
      }
    }
  }

  getClientCount(): number {
    return this.clients.size
  }
}
