/**
 * @fileoverview Session Manager for reconnection support
 *
 * @module @gravito/ripple/tracking
 */

import type { RippleLogger } from '../logging/Logger'
import { createLogger } from '../logging/Logger'

/**
 * Session data stored for reconnection.
 */
export interface SessionData {
    /** Client ID */
    clientId: string
    /** User ID if authenticated */
    userId?: string | number
    /** Channels the client was subscribed to */
    channels: string[]
    /** User info for presence channels */
    userInfo?: Record<string, unknown>
    /** Session expiry timestamp */
    expiresAt: number
}

/**
 * Manages disconnected client sessions for reconnection support.
 *
 * When a client disconnects, their session is stored temporarily to allow
 * them to reconnect and resume their subscriptions without re-authorization.
 *
 * @example
 * ```typescript
 * const sessionManager = new SessionManager({
 *   sessionTTL: 60000, // 1 minute
 *   maxSessions: 10000
 * })
 *
 * // On disconnect
 * const token = sessionManager.createSession({
 *   clientId: 'client-123',
 *   userId: 'user-456',
 *   channels: ['news', 'presence-lobby'],
 *   userInfo: { name: 'John' }
 * })
 *
 * // On reconnect
 * const session = sessionManager.getSession(token)
 * if (session) {
 *   // Restore subscriptions
 *   for (const channel of session.channels) {
 *     await subscribe(session.clientId, channel)
 *   }
 * }
 * ```
 */
export class SessionManager {
    private sessions = new Map<string, SessionData>()
    private cleanupInterval?: ReturnType<typeof setInterval>
    private logger: RippleLogger

    constructor(
        private config: {
            sessionTTL: number
            maxSessions: number
            logger?: RippleLogger
        }
    ) {
        this.logger = config.logger ?? createLogger('SessionManager')
        this.startCleanup()
    }

    /**
     * Create a new session for a disconnected client.
     *
     * @param data - Session data to store
     * @returns Reconnection token
     */
    createSession(data: Omit<SessionData, 'expiresAt'>): string {
        // Generate reconnection token
        const token = crypto.randomUUID()

        // Check session limit
        if (this.sessions.size >= this.config.maxSessions) {
            this.logger.warn('Session limit reached, removing oldest session')
            this.removeOldestSession()
        }

        // Store session
        this.sessions.set(token, {
            ...data,
            expiresAt: Date.now() + this.config.sessionTTL,
        })

        this.logger.debug('Created session', {
            token,
            clientId: data.clientId,
            channels: data.channels.length,
        })

        return token
    }

    /**
     * Get a session by reconnection token.
     *
     * @param token - Reconnection token
     * @returns Session data if found and not expired, undefined otherwise
     */
    getSession(token: string): SessionData | undefined {
        const session = this.sessions.get(token)

        if (!session) {
            return undefined
        }

        // Check expiry
        if (Date.now() > session.expiresAt) {
            this.sessions.delete(token)
            this.logger.debug('Session expired', { token })
            return undefined
        }

        return session
    }

    /**
     * Remove a session by token.
     *
     * @param token - Reconnection token
     */
    removeSession(token: string): void {
        this.sessions.delete(token)
        this.logger.debug('Removed session', { token })
    }

    /**
     * Get the number of active sessions.
     */
    getSessionCount(): number {
        return this.sessions.size
    }

    /**
     * Start periodic cleanup of expired sessions.
     */
    private startCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredSessions()
        }, 30000) // Run every 30 seconds
    }

    /**
     * Clean up expired sessions.
     */
    private cleanupExpiredSessions(): void {
        const now = Date.now()
        let removed = 0

        for (const [token, session] of this.sessions.entries()) {
            if (now > session.expiresAt) {
                this.sessions.delete(token)
                removed++
            }
        }

        if (removed > 0) {
            this.logger.debug('Cleaned up expired sessions', { removed })
        }
    }

    /**
     * Remove the oldest session to make room for new ones.
     */
    private removeOldestSession(): void {
        let oldestToken: string | undefined
        let oldestExpiry = Infinity

        for (const [token, session] of this.sessions.entries()) {
            if (session.expiresAt < oldestExpiry) {
                oldestExpiry = session.expiresAt
                oldestToken = token
            }
        }

        if (oldestToken) {
            this.sessions.delete(oldestToken)
            this.logger.debug('Removed oldest session', { token: oldestToken })
        }
    }

    /**
     * Shutdown the session manager and clear all sessions.
     */
    shutdown(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval)
            this.cleanupInterval = undefined
        }

        this.sessions.clear()
        this.logger.info('SessionManager shutdown complete')
    }
}
