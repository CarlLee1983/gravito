import type { GravitoContext } from '@gravito/core'

/**
 * Mock Context Options
 */
interface MockContextOptions {
  method?: string
  path?: string
  headers?: Record<string, string>
  body?: Record<string, any>
  query?: Record<string, string>
  user?: any
  session?: Record<string, any>
  jsonMode?: boolean
  auth?: {
    check?: () => Promise<boolean>
    attempt?: (credentials: any, remember?: boolean) => Promise<boolean>
    user?: () => Promise<any>
    login?: (user: any) => Promise<void>
    logout?: () => Promise<void>
  }
}

/**
 * Create a mock Gravito Context for testing
 */
export function createMockContext(options: MockContextOptions = {}): GravitoContext {
  const {
    method = 'GET',
    path = '/',
    headers = {},
    body = {},
    query = {},
    user = null,
    session = {},
    auth,
  } = options

  const sessionStore = new Map<string, any>(Object.entries(session))
  const contextStore = new Map<string, any>()

  const mockRequest = {
    method,
    url: path,
    header: (name: string) => {
      const lowerName = name.toLowerCase()
      const headerKeys = Object.keys(headers)
      const matchedKey = headerKeys.find((k) => k.toLowerCase() === lowerName)
      return matchedKey ? headers[matchedKey] : null
    },
    parseBody: async () => body,
    json: async () => body,
    query: () => query,
  }

  // Mock response helpers
  let responseStatus = 200
  let responseBody: any = null
  const responseHeaders: Record<string, string> = {}
  let redirectUrl: string | null = null

  const context = {
    req: mockRequest,

    // Response methods
    json: (data: any, status = 200) => {
      responseStatus = status
      responseBody = data
      return {
        status: responseStatus,
        body: responseBody,
        headers: new Map(Object.entries(responseHeaders)),
        json: async () => data,
      }
    },

    redirect: (url: string, status = 302) => {
      responseStatus = status
      redirectUrl = url
      responseHeaders.location = url
      const headersMap = new Map(Object.entries(responseHeaders))
      return {
        status: responseStatus,
        headers: {
          get: (name: string) => responseHeaders[name.toLowerCase()],
          ...headersMap,
        },
      }
    },

    html: (content: string, status = 200) => {
      responseStatus = status
      responseBody = content
      responseHeaders['content-type'] = 'text/html'
      return {
        status: responseStatus,
        body: responseBody,
        headers: new Map(Object.entries(responseHeaders)),
      }
    },

    header: (name: string, value: string) => {
      responseHeaders[name.toLowerCase()] = value
    },

    // Context storage (for services like auth)
    get: (key: string) => {
      if (contextStore.has(key)) {
        return contextStore.get(key)
      }
      if (key === 'auth') {
        if (auth) {
          return {
            check: auth.check ?? (async () => !!user),
            user: auth.user ?? (async () => user),
            attempt:
              auth.attempt ??
              (async (email: string, password: string) => {
                return email === 'test@example.com' && password === 'password123'
              }),
            login: auth.login ?? (async () => true),
            logout: auth.logout ?? (async () => true),
          }
        }
        return {
          user: async () => user,
          check: async () => !!user,
          attempt: async (email: string, password: string) => {
            return email === 'test@example.com' && password === 'password123'
          },
          login: async () => true,
          logout: async () => true,
        }
      }
      if (key === 'session') {
        return {
          get: (k: string) => sessionStore.get(k),
          set: (k: string, v: any) => sessionStore.set(k, v),
          forget: (k: string) => sessionStore.delete(k),
          regenerate: async () => {},
        }
      }
      return null
    },

    set: (key: string, value: any) => {
      contextStore.set(key, value)
    },

    // Internal getters for testing
    _getResponseStatus: () => responseStatus,
    _getResponseBody: () => responseBody,
    _getResponseHeaders: () => responseHeaders,
    _getRedirectUrl: () => redirectUrl,
  } as any

  return context as GravitoContext
}

/**
 * Create a mock Next function for middleware testing
 */
export function createMockNext(): () => Promise<void> {
  let called = false
  const next = async () => {
    called = true
  }
  ;(next as any).wasCalled = () => called
  return next as any
}
