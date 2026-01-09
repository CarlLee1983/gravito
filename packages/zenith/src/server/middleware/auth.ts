import type { Context, Next } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

// Session token store (in-memory for simplicity, consider Redis for production)
const sessions = new Map<string, { createdAt: number; expiresAt: number }>()

// Configuration
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours
const SESSION_COOKIE_NAME = 'flux_session'

/**
 * Generate a secure random session token
 */
function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Check if authentication is enabled
 */
export function isAuthEnabled(): boolean {
  return !!process.env.AUTH_PASSWORD
}

/**
 * Verify the provided password against the environment variable
 */
export function verifyPassword(password: string): boolean {
  const authPassword = process.env.AUTH_PASSWORD
  if (!authPassword) {
    return true // No password set, allow access
  }
  return password === authPassword
}

/**
 * Create a new session and set the cookie
 */
export function createSession(c: Context): string {
  const token = generateSessionToken()
  const now = Date.now()

  sessions.set(token, {
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  })

  setCookie(c, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: SESSION_DURATION_MS / 1000,
    path: '/',
  })

  return token
}

/**
 * Validate a session token
 */
export function validateSession(token: string): boolean {
  const session = sessions.get(token)
  if (!session) {
    return false
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(token)
    return false
  }

  return true
}

/**
 * Destroy a session
 */
export function destroySession(c: Context): void {
  const token = getCookie(c, SESSION_COOKIE_NAME)
  if (token) {
    sessions.delete(token)
  }
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' })
}

/**
 * Authentication middleware for API routes
 */
export async function authMiddleware(c: Context, next: Next) {
  // If no password is set, allow all requests
  if (!isAuthEnabled()) {
    return next()
  }

  // Allow auth endpoints without authentication
  const path = c.req.path
  if (path === '/api/auth/login' || path === '/api/auth/status' || path === '/api/auth/logout') {
    return next()
  }

  // Check for valid session
  const token = getCookie(c, SESSION_COOKIE_NAME)
  if (token && validateSession(token)) {
    return next()
  }

  // Unauthorized
  return c.json({ error: 'Unauthorized', message: 'Please login to access this resource' }, 401)
}

/**
 * Clean up expired sessions periodically
 */
export function cleanupExpiredSessions(): void {
  const now = Date.now()
  for (const [token, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(token)
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupExpiredSessions, 10 * 60 * 1000)
