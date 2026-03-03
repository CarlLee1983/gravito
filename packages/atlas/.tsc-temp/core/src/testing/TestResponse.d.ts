/**
 * TestResponse wraps a standard Fetch Response and provides fluent assertion methods
 * inspired by Laravel's TestResponse.
 */
export declare class TestResponse {
  readonly response: Response
  private _jsonData
  private _textData
  constructor(response: Response)
  /**
   * Assert the response status code
   */
  assertStatus(status: number): this
  /**
   * Assert that the response has a 200 status code
   */
  assertOk(): this
  /**
   * Assert that the response has a 201 status code
   */
  assertCreated(): this
  /**
   * Assert that the response has a 404 status code
   */
  assertNotFound(): this
  /**
   * Assert that the response has a 403 status code
   */
  assertForbidden(): this
  /**
   * Assert that the response has a 401 status code
   */
  assertUnauthorized(): this
  /**
   * Assert the response is a redirect
   */
  assertRedirect(uri?: string): this
  /**
   * Assert that the response contains the given JSON data.
   */
  assertJson(data: any): Promise<this>
  /**
   * Assert that the response contains exactly the given JSON data.
   */
  assertExactJson(data: any): Promise<this>
  /**
   * Assert the structure of the JSON response.
   */
  assertJsonStructure(structure: any): Promise<this>
  /**
   * Assert that the response contains the given string.
   */
  assertSee(value: string): Promise<this>
  /**
   * Assert that the response does not contain the given string.
   */
  assertDontSee(value: string): Promise<this>
  /**
   * Assert a header exists and matches value
   */
  assertHeader(header: string, value: string): this
  /**
   * Assert a header does not exist
   */
  assertHeaderMissing(header: string): this
  /**
   * Get the JSON content
   */
  getJson(): Promise<any>
  /**
   * Get the text content
   */
  getText(): Promise<string>
  /**
   * Alias for getText for standard expectations if needed
   */
  get body(): Promise<string>
}
