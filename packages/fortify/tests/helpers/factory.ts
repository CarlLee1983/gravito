/**
 * Test Data Factory
 *
 * Provides helper functions to generate test data consistently
 */

/**
 * Generate a random email address
 */
export function generateEmail(prefix = 'user'): string {
  const random = Math.random().toString(36).substring(7)
  return `${prefix}-${random}@example.com`
}

/**
 * Generate a random password
 */
export function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * Generate a random token
 */
export function generateToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Generate a mock user data object
 */
export function generateUserData(overrides: Record<string, any> = {}) {
  return {
    name: 'Test User',
    email: generateEmail(),
    password: 'password123',
    email_verified_at: null,
    ...overrides,
  }
}

/**
 * Generate a valid password reset token
 */
export function generateResetToken(): string {
  return `reset_${generateToken(64)}`
}

/**
 * Generate a valid email verification hash
 */
export function generateVerificationHash(): string {
  return `verify_${generateToken(64)}`
}

/**
 * Wait for async operations (useful in tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
