import { expect } from 'bun:test'

/**
 * TestResponse wraps a standard Fetch Response and provides fluent assertion methods
 * inspired by Laravel's TestResponse.
 */
export class TestResponse {
  private _jsonData: unknown = null
  private _textData: string | null = null

  constructor(public readonly response: Response) {}

  /**
   * Assert the response status code
   */
  assertStatus(status: number): this {
    expect(this.response.status).toBe(status)
    return this
  }

  /**
   * Assert that the response has a 200 status code
   */
  assertOk(): this {
    return this.assertStatus(200)
  }

  /**
   * Assert that the response has a 201 status code
   */
  assertCreated(): this {
    return this.assertStatus(201)
  }

  /**
   * Assert that the response has a 404 status code
   */
  assertNotFound(): this {
    return this.assertStatus(404)
  }

  /**
   * Assert that the response has a 403 status code
   */
  assertForbidden(): this {
    return this.assertStatus(403)
  }

  /**
   * Assert that the response has a 401 status code
   */
  assertUnauthorized(): this {
    return this.assertStatus(401)
  }

  /**
   * Assert the response is a redirect
   */
  assertRedirect(uri?: string): this {
    expect([301, 302, 303, 307, 308]).toContain(this.response.status)
    if (uri) {
      expect(this.response.headers.get('Location')).toBe(uri)
    }
    return this
  }

  /**
   * Assert that the response contains the given JSON data.
   */
  async assertJson(data: unknown): Promise<this> {
    const json = await this.getJson()
    expect(json).toMatchObject(data as object)
    return this
  }

  /**
   * Assert that the response contains exactly the given JSON data.
   */
  async assertExactJson(data: unknown): Promise<this> {
    const json = await this.getJson()
    expect(json).toEqual(data)
    return this
  }

  /**
   * Assert the structure of the JSON response.
   */
  async assertJsonStructure(structure: unknown): Promise<this> {
    const json = await this.getJson()
    // Simple implementation: check keys recursively
    const checkKeys = (data: unknown, struct: unknown) => {
      const structObj = struct as Record<string, unknown>
      const dataObj = data as Record<string, unknown>
      for (const key in structObj) {
        if (Array.isArray(structObj[key])) {
          expect(Array.isArray(dataObj[key])).toBe(true)
          const dataArr = dataObj[key] as unknown[]
          const structArr = structObj[key] as unknown[]
          if (dataArr.length > 0) {
            checkKeys(dataArr[0], structArr[0])
          }
        } else if (typeof structObj[key] === 'object') {
          expect(typeof dataObj[key]).toBe('object')
          checkKeys(dataObj[key], structObj[key])
        } else {
          expect(data).toHaveProperty(key)
        }
      }
    }
    checkKeys(json, structure)
    return this
  }

  /**
   * Assert that the response contains the given string.
   */
  async assertSee(value: string): Promise<this> {
    const text = await this.getText()
    expect(text).toContain(value)
    return this
  }

  /**
   * Assert that the response does not contain the given string.
   */
  async assertDontSee(value: string): Promise<this> {
    const text = await this.getText()
    expect(text).not.toContain(value)
    return this
  }

  /**
   * Assert a header exists and matches value
   */
  assertHeader(header: string, value: string): this {
    expect(this.response.headers.get(header)).toBe(value)
    return this
  }

  /**
   * Assert a header does not exist
   */
  assertHeaderMissing(header: string): this {
    expect(this.response.headers.has(header)).toBe(false)
    return this
  }

  /**
   * Get the JSON content
   */
  async getJson(): Promise<unknown> {
    if (this._jsonData) {
      return this._jsonData
    }
    this._jsonData = await this.response.json()
    return this._jsonData
  }

  /**
   * Get the text content
   */
  async getText(): Promise<string> {
    if (this._textData !== null) {
      return this._textData
    }
    this._textData = await this.response.text()
    return this._textData
  }

  /**
   * Alias for getText for standard expectations if needed
   */
  get body(): Promise<string> {
    return this.getText()
  }
}
