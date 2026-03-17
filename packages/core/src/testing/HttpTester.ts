import type { PlanetCore } from '../PlanetCore'
import { TestResponse } from './TestResponse'

/**
 * HttpTester provides a way to simulate HTTP requests against a PlanetCore instance
 * and returns a TestResponse for assertions.
 */
export class HttpTester {
  private cookies: Map<string, string> = new Map()

  constructor(private core: PlanetCore) {}

  /**
   * Make a GET request
   */
  async get(uri: string, headers: Record<string, string> = {}): Promise<TestResponse> {
    return this.call('GET', uri, null, headers)
  }

  /**
   * Make a POST request
   */
  async post(
    uri: string,
    data: any = null,
    headers: Record<string, string> = {}
  ): Promise<TestResponse> {
    return this.call('POST', uri, data, headers)
  }

  /**
   * Make a PUT request
   */
  async put(
    uri: string,
    data: any = null,
    headers: Record<string, string> = {}
  ): Promise<TestResponse> {
    return this.call('PUT', uri, data, headers)
  }

  /**
   * Make a PATCH request
   */
  async patch(
    uri: string,
    data: any = null,
    headers: Record<string, string> = {}
  ): Promise<TestResponse> {
    return this.call('PATCH', uri, data, headers)
  }

  /**
   * Make a DELETE request
   */
  async delete(
    uri: string,
    data: any = null,
    headers: Record<string, string> = {}
  ): Promise<TestResponse> {
    return this.call('DELETE', uri, data, headers)
  }

  /**
   * Core call method
   */
  private async call(
    method: string,
    uri: string,
    data: any,
    headers: Record<string, string>
  ): Promise<TestResponse> {
    const url = uri.startsWith('http')
      ? uri
      : `http://localhost${uri.startsWith('/') ? '' : '/'}${uri}`

    let body = null
    const requestHeaders = { ...headers }

    // Add cookies to headers
    if (this.cookies.size > 0) {
      const cookieString = Array.from(this.cookies.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join('; ')
      requestHeaders.Cookie = cookieString
    }

    if (data) {
      if (typeof data === 'object' && !(data instanceof FormData) && !(data instanceof Blob)) {
        body = JSON.stringify(data)
        if (!requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
          requestHeaders['Content-Type'] = 'application/json'
        }
      } else {
        body = data
      }
    }

    const request = new Request(url, {
      method,
      headers: requestHeaders,
      body,
    })

    // Use the core adapter's fetch directly to avoid network overhead
    const response = await this.core.adapter.fetch(request)

    // Capture cookies from response
    for (const setCookie of this.getSetCookieHeaders(response.headers)) {
      const cookiePair = setCookie.split(';')[0]?.trim()
      if (!cookiePair) {
        continue
      }
      const [name, ...valueParts] = cookiePair.split('=')
      if (name) {
        this.cookies.set(name, valueParts.join('='))
      }
    }

    return new TestResponse(response)
  }

  private getSetCookieHeaders(headers: Headers): string[] {
    const headersWithGetSetCookie = headers as Headers & {
      getSetCookie?: () => string[]
      toJSON?: () => Record<string, string | string[]>
    }

    const getSetCookie = headersWithGetSetCookie.getSetCookie?.()
    if (getSetCookie && getSetCookie.length > 0) {
      return getSetCookie
    }

    const headerJson = headersWithGetSetCookie.toJSON?.()
    const jsonSetCookie = headerJson?.['set-cookie']
    if (Array.isArray(jsonSetCookie)) {
      return jsonSetCookie
    }
    if (typeof jsonSetCookie === 'string') {
      return [jsonSetCookie]
    }

    const setCookie = headers.get('Set-Cookie')
    return setCookie ? [setCookie] : []
  }
}

/**
 * Helper to create an HttpTester for a PlanetCore instance
 */
export function createHttpTester(core: PlanetCore): HttpTester {
  return new HttpTester(core)
}
