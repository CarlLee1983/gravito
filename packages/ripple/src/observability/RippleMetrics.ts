import type { ConnectionTracker } from '../tracking/ConnectionTracker'
import type { AckManager } from '../reliability/AckManager'

/**
 * Prometheus metrics exporter for Ripple.
 *
 * @since 3.7.0
 */
export class RippleMetrics {
    private prefix: string
    private tracker: ConnectionTracker
    private ackManager?: AckManager
    private slowClients: number = 0

    constructor(tracker: ConnectionTracker, prefix: string = 'ripple', ackManager?: AckManager) {
        this.tracker = tracker
        this.prefix = prefix
        this.ackManager = ackManager
    }

    /**
     * Increment the counter for slow clients isolated or disconnected.
     */
    incrementSlowClients(): void {
        this.slowClients++
    }

    /**
     * Export metrics in Prometheus text format.
     *
     * @returns String containing Prometheus metrics
     */
    export(): string {
        const activeConnections = this.tracker.getActiveConnections()
        const pendingAcks = this.ackManager?.getPendingCount() ?? 0

        return [
            `# HELP ${this.prefix}_connections_active Currently active WebSocket connections`,
            `# TYPE ${this.prefix}_connections_active gauge`,
            `${this.prefix}_connections_active ${activeConnections}`,

            `# HELP ${this.prefix}_acks_pending Current number of messages waiting for ACK`,
            `# TYPE ${this.prefix}_acks_pending gauge`,
            `${this.prefix}_acks_pending ${pendingAcks}`,

            `# HELP ${this.prefix}_slow_clients_total Total number of slow clients isolated/disconnected`,
            `# TYPE ${this.prefix}_slow_clients_total counter`,
            `${this.prefix}_slow_clients_total ${this.slowClients}`,
        ].join('\n') + '\n'
    }
}
