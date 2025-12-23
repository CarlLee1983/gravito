/**
 * @fileoverview Signature validation utilities
 *
 * Provides HMAC-based signature verification for webhook payloads.
 *
 * @module @gravito/echo/receive
 */

/**
 * Compute HMAC-SHA256 signature
 */
export async function computeHmacSha256(payload: string | Buffer, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const payloadBuffer =
    typeof payload === 'string'
      ? new TextEncoder().encode(payload)
      : new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength)

  const signature = await crypto.subtle.sign('HMAC', key, payloadBuffer as BufferSource)
  return Buffer.from(signature).toString('hex')
}

/**
 * Compute HMAC-SHA1 signature (for legacy providers)
 */
export async function computeHmacSha1(payload: string | Buffer, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )

  const payloadBuffer =
    typeof payload === 'string'
      ? new TextEncoder().encode(payload)
      : new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength)

  const signature = await crypto.subtle.sign('HMAC', key, payloadBuffer as BufferSource)
  return Buffer.from(signature).toString('hex')
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  const aBytes = new TextEncoder().encode(a)
  const bBytes = new TextEncoder().encode(b)

  let result = 0
  for (let i = 0; i < aBytes.length; i++) {
    result |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0)
  }

  return result === 0
}

/**
 * Validate timestamp is within tolerance
 *
 * @param timestamp - Unix timestamp in seconds
 * @param tolerance - Tolerance in seconds (default: 300 = 5 minutes)
 */
export function validateTimestamp(timestamp: number, tolerance = 300): boolean {
  const now = Math.floor(Date.now() / 1000)
  return Math.abs(now - timestamp) <= tolerance
}

/**
 * Parse Stripe-style signature header
 * Format: t=timestamp,v1=signature,v1=signature2
 */
export function parseStripeSignature(
  header: string
): { timestamp: number; signatures: string[] } | null {
  const parts = header.split(',')
  let timestamp: number | undefined
  const signatures: string[] = []

  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key === 't' && value !== undefined) {
      timestamp = parseInt(value, 10)
    } else if (key === 'v1' && value !== undefined) {
      signatures.push(value)
    }
  }

  if (timestamp === undefined || signatures.length === 0) {
    return null
  }

  return { timestamp, signatures }
}
