import type { PlanetCore } from '../PlanetCore'
import { TestResponse } from './TestResponse'

/**
 * HttpTester provides a way to simulate HTTP requests against a PlanetCore instance
 * and returns a TestResponse for assertions.
 */
export class HttpTester {
    constructor(private core: PlanetCore) { }

    /**
     * Make a GET request
     */
    async get(uri: string, headers: Record<string, string> = {}): Promise<TestResponse> {
        return this.call('GET', uri, null, headers)
    }

    /**
     * Make a POST request
     */
    async post(uri: string, data: any = null, headers: Record<string, string> = {}): Promise<TestResponse> {
        return this.call('POST', uri, data, headers)
    }

    /**
     * Make a PUT request
     */
    async put(uri: string, data: any = null, headers: Record<string, string> = {}): Promise<TestResponse> {
        return this.call('PUT', uri, data, headers)
    }

    /**
     * Make a PATCH request
     */
    async patch(uri: string, data: any = null, headers: Record<string, string> = {}): Promise<TestResponse> {
        return this.call('PATCH', uri, data, headers)
    }

    /**
     * Make a DELETE request
     */
    async delete(uri: string, data: any = null, headers: Record<string, string> = {}): Promise<TestResponse> {
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
        const url = uri.startsWith('http') ? uri : `http://localhost${uri.startsWith('/') ? '' : '/'}${uri}`

        let body = null
        const requestHeaders = { ...headers }

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
        return new TestResponse(response)
    }
}

/**
 * Helper to create an HttpTester for a PlanetCore instance
 */
export function createHttpTester(core: PlanetCore): HttpTester {
    return new HttpTester(core)
}
