// Authentication utilities for API context
export const parseAuthToken = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null
  }
  const [, token] = authHeader.split(' ')
  return token || null
}

export const decodeToken = (token: string): { sub: string; email: string; role: string } | null => {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString())
  } catch {
    return null
  }
}
