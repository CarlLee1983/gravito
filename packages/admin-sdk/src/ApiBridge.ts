/**
 * Gravito Admin SDK - API Bridge
 * Handles standardized HTTP communication with the backend.
 */

export interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string>
}

export class ApiError extends Error {
  constructor(
    public override message: string,
    public status: number,
    public code?: string,
    public errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class ApiBridge {
  constructor(private baseUrl: string) {}

  /**
   * Get the stored token
   */
  private getToken(): string | null {
    return localStorage.getItem('gravito_admin_token')
  }

  /**
   * Execute an HTTP request
   */
  async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const { params, ...init } = options

    // Build URL with query params
    let url = `${this.baseUrl}${path}`
    if (params) {
      const searchParams = new URLSearchParams(params)
      url += `?${searchParams.toString()}`
    }

    // Set headers
    const headers = new Headers(init.headers || {})
    headers.set('Accept', 'application/json')
    if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json')
    }

    // Inject Auth Header
    const token = this.getToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    try {
      const response = await fetch(url, { ...init, headers })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new ApiError(
          data?.message || 'An unexpected error occurred',
          response.status,
          data?.code,
          data?.errors
        )
      }

      return data as T
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError('Network connection failed', 0)
    }
  }

  get<T>(path: string, options?: ApiRequestOptions) {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  post<T>(path: string, body?: any, options?: ApiRequestOptions) {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  put<T>(path: string, body?: any, options?: ApiRequestOptions) {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  patch<T>(path: string, body?: any, options?: ApiRequestOptions) {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  delete<T>(path: string, options?: ApiRequestOptions) {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }
}
