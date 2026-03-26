/**
 * OpenAPI schema generation using Hono + Zod.
 *
 * Provides PhotonOpenAPI class (extends OpenAPIHono) for defining
 * typed OpenAPI routes with Zod schema validation.
 *
 * @deprecated v2.0 — OpenAPI path has explicit Hono dependency
 *
 * Removal target: v3.0
 *
 * In v3.0+, this module will be replaced with a native Gravito OpenAPI
 * generator that doesn't require Hono dependencies. v2.0 and v2.x users
 * can continue using this for OpenAPI schema generation.
 *
 * Usage: import { PhotonOpenAPI } from '@gravito/photon/openapi'
 *
 * @see {@link https://hono.dev/snippets/zod-openapi} Hono OpenAPI integration
 *
 * @packageDocumentation
 */

import type { RouteConfig } from '@hono/zod-openapi'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'

/**
 * Photon Open API Class
 * Extends OpenAPIHono to provide a seamless OpenAPI integration.
 */
export class PhotonOpenAPI extends OpenAPIHono {
  /**
   * Helper to create a fully typed route definition.
   */
  static route(config: RouteConfig): RouteConfig {
    return createRoute(config)
  }
}

export { createRoute, z }
