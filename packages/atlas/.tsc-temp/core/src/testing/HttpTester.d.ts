import type { PlanetCore } from '../PlanetCore'
import { TestResponse } from './TestResponse'
/**
 * HttpTester provides a way to simulate HTTP requests against a PlanetCore instance
 * and returns a TestResponse for assertions.
 */
export declare class HttpTester {
  private core
  private cookies
  constructor(core: PlanetCore)
  /**
   * Make a GET request
   */
  get(uri: string, headers?: Record<string, string>): Promise<TestResponse>
  /**
   * Make a POST request
   */
  post(uri: string, data?: any, headers?: Record<string, string>): Promise<TestResponse>
  /**
   * Make a PUT request
   */
  put(uri: string, data?: any, headers?: Record<string, string>): Promise<TestResponse>
  /**
   * Make a PATCH request
   */
  patch(uri: string, data?: any, headers?: Record<string, string>): Promise<TestResponse>
  /**
   * Make a DELETE request
   */
  delete(uri: string, data?: any, headers?: Record<string, string>): Promise<TestResponse>
  /**
   * Core call method
   */
  private call
}
/**
 * Helper to create an HttpTester for a PlanetCore instance
 */
export declare function createHttpTester(core: PlanetCore): HttpTester
