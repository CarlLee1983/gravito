/**
 * SSEManager - Manages Server-Sent Events (SSE) client connections.
 * Provides a way to broadcast real-time updates from domain events to connected web clients.
 *
 * Features:
 * - Connection limit to prevent resource exhaustion
 * - Automatic cleanup of disconnected clients
 * - Safe broadcasting with error handling
 */
export class SSEManager {
  /** Maximum concurrent SSE connections allowed. */
  private readonly MAX_CLIENTS = 1000

  /** Active SSE client controllers. */
  private readonly clients = new Set<ReadableStreamDefaultController>()

  /**
   * Registers a new SSE client connection.
   *
   * @param controller - The controller for the client's readable stream.
   * @throws Error if max clients limit is exceeded.
   */
  registerClient(controller: ReadableStreamDefaultController): void {
    if (this.clients.size >= this.MAX_CLIENTS) {
      throw new Error(`Maximum SSE connections (${this.MAX_CLIENTS}) exceeded. Request rejected.`)
    }
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
   * Automatically removes clients that fail to enqueue (likely disconnected).
   *
   * @param eventType - The name of the event being sent.
   * @param data - The payload to be serialized as JSON and sent.
   */
  broadcast(eventType: string, data: unknown): void {
    const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
    const encoder = new TextEncoder()
    const encoded = encoder.encode(message)

    const failedClients: ReadableStreamDefaultController[] = []

    for (const controller of this.clients) {
      try {
        controller.enqueue(encoded)
      } catch {
        // Mark for removal if enqueue fails (likely disconnected)
        failedClients.push(controller)
      }
    }

    // Clean up failed clients
    for (const controller of failedClients) {
      this.clients.delete(controller)
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

  /**
   * Gets the maximum allowed concurrent connections.
   *
   * @returns The maximum client limit.
   */
  getMaxClients(): number {
    return this.MAX_CLIENTS
  }
}
