/**
 * @fileoverview Server-Sent Events handler for real-time status updates
 */

import type { ProcessingStatus } from '../types'
import type { StatusStore } from './StatusStore'

/**
 * SSE handler for processing status streaming
 */
export class SSEHandler {
  constructor(private statusStore: StatusStore) {}

  /**
   * Create SSE stream for job status
   *
   * @param jobId - Job ID
   * @returns Response with SSE stream
   */
  async createStream(jobId: string): Promise<Response> {
    // Get initial status
    const initialStatus = await this.statusStore.get(jobId)

    if (!initialStatus) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create readable stream
    const handler = this
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial status
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialStatus)}\n\n`))

        // If already completed or failed, close stream
        if (initialStatus.status === 'completed' || initialStatus.status === 'failed') {
          controller.close()
          return
        }

        // Subscribe to status changes
        const unsubscribe = handler.statusStore.onChange(jobId, (newStatus: ProcessingStatus) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(newStatus)}\n\n`))

            // Close stream if completed or failed
            if (newStatus.status === 'completed' || newStatus.status === 'failed') {
              unsubscribe()
              controller.close()
            }
          } catch (error) {
            console.error('[SSEHandler] Error sending status:', error)
            unsubscribe()
            controller.close()
          }
        })

        // Handle client disconnect
        // Note: In Bun, we can detect disconnect via AbortSignal
        // For now, we'll rely on the stream being closed by the client
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    })
  }
}
