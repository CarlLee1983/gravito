/**
 * SSEManager - Manages Server-Sent Events (SSE) client connections.
 * Provides a way to broadcast real-time updates from domain events to connected web clients.
 */
export class SSEManager {
  /** Active SSE client controllers. */
  private readonly clients = new Set<ReadableStreamDefaultController>()

  /**
   * Registers a new SSE client connection.
   *
   * @param controller - The controller for the client's readable stream.
   */
  registerClient(controller: ReadableStreamDefaultController): void {
    this.clients.add(controller)
  }

  /**
   * Unregisters an SSE client connection, typically when the connection is closed.
   *
   * @param controller - The controller to remove.
   */
  unregisterClient(controller: ReadableStreamDefaultController): void {
    this.clients.delete(controller)
  }

  /**
   * Broadcasts a JSON-formatted event message to all connected clients.
   *
   * @param eventType - The name of the event being sent.
   * @param data - The payload to be serialized as JSON and sent.
   */
  broadcast(eventType: string, data: unknown): void {
    const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
    const encoder = new TextEncoder()
    const encoded = encoder.encode(message)

    for (const controller of this.clients) {
      try {
        controller.enqueue(encoded)
      } catch {
        // Remove client if enqueue fails (likely disconnected)
        this.clients.delete(controller)
      }
    }
  }

  /**
   * Gets the total number of currently connected SSE clients.
   *
   * @returns The active client count.
   */
  getClientCount(): number {
    return this.clients.size
  }
}
