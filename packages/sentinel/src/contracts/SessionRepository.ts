/**
 * Interface for interacting with the session storage backend.
 *
 * This repository allows managing sessions beyond the current request context,
 * enabling features like "logout from all devices" or listing active sessions.
 *
 * @public
 */
export interface SessionRepository {
  /**
   * Get all active sessions for a specific user.
   *
   * @param userId - The user's unique identifier
   * @returns List of session data objects
   */
  findAllByUserId(userId: string | number): Promise<SessionData[]>

  /**
   * Destroy a specific session by its ID.
   *
   * @param sessionId - The session ID to destroy
   */
  destroy(sessionId: string): Promise<void>

  /**
   * Destroy all sessions for a specific user.
   *
   * @param userId - The user's unique identifier
   */
  destroyAllByUserId(userId: string | number): Promise<void>

  /**
   * Destroy all sessions for a specific user except the given session ID.
   *
   * @param userId - The user's unique identifier
   * @param exceptSessionId - The session ID to keep alive
   */
  destroyAllByUserIdExcept(userId: string | number, exceptSessionId: string): Promise<void>
}

/**
 * Data structure representing a stored session.
 * @public
 */
export interface SessionData {
  id: string
  userId: string | number
  ipAddress?: string
  userAgent?: string
  lastActivity: number
  payload: Record<string, unknown>
}
