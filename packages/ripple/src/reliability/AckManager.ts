import type { RippleLogger } from '../logging/Logger'

/**
 * Interface for a message that is pending acknowledgement.
 */
export interface PendingAck {
    clientId: string
    seq: number
    timer: ReturnType<typeof setTimeout>
    resolve: (value: boolean) => void
    reject: (reason: any) => void
}

/**
 * Manages message acknowledgements for Ripple.
 *
 * @since 3.7.0
 */
export class AckManager {
    private pendingAcks: Map<string, PendingAck> = new Map()
    private nextSeq: number = 1
    private logger: RippleLogger

    constructor(logger: RippleLogger) {
        this.logger = logger
    }

    /**
     * Register a message that requires acknowledgement.
     *
     * @param clientId - The ID of the client the message was sent to
     * @param timeout - How long to wait for ACK in ms
     * @returns A promise that resolves to true when ACKed, or false if timed out
     */
    register(clientId: string, timeout: number = 5000): { seq: number; promise: Promise<boolean> } {
        const seq = this.nextSeq++
        const key = `${clientId}:${seq}`

        const promise = new Promise<boolean>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.logger.warn('Message ACK timeout', { clientId, seq })
                this.pendingAcks.delete(key)
                resolve(false)
            }, timeout)

            this.pendingAcks.set(key, {
                clientId,
                seq,
                timer,
                resolve,
                reject,
            })
        })

        return { seq, promise }
    }

    /**
     * Confirm receipt of a message.
     *
     * @param clientId - The ID of the client that sent the ACK
     * @param seq - The sequence number being confirmed
     */
    confirm(clientId: string, seq: number): boolean {
        const key = `${clientId}:${seq}`
        const pending = this.pendingAcks.get(key)

        if (pending) {
            clearTimeout(pending.timer)
            this.pendingAcks.delete(key)
            pending.resolve(true)
            return true
        }

        return false
    }

    /**
     * Clear all pending ACKs for a client (e.g., on disconnect).
     */
    clearClient(clientId: string): void {
        for (const [key, pending] of this.pendingAcks.entries()) {
            if (pending.clientId === clientId) {
                clearTimeout(pending.timer)
                this.pendingAcks.delete(key)
                pending.resolve(false)
            }
        }
    }

    /**
     * Get the number of pending ACKs.
     */
    getPendingCount(): number {
        return this.pendingAcks.size
    }
}
