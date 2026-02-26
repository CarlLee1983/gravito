/**
 * @file packages/photon/src/openapi.ts
 * @module @gravito/photon/openapi
 * @description OpenAPI (Swagger) integration for Photon
 */
import type { RouteConfig } from '@hono/zod-openapi'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
/**
 * Photon Open API Class
 * Extends OpenAPIHono to provide a seamless OpenAPI integration.
 */
export declare class PhotonOpenAPI extends OpenAPIHono {
  /**
   * Helper to create a fully typed route definition.
   */
  static route(config: RouteConfig): RouteConfig
}
export { createRoute, z }
