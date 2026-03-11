/**
 * @deprecated v2.0 - Hono compatibility layer, will be removed
 *
 * This module re-exports Hono utilities for backwards compatibility.
 * For v2.0+, please use:
 * - Native Bun APIs for server functionality
 * - Gravito native implementations where available
 * - Custom implementations for app-specific needs
 *
 * Removal timeline: v2.0 (2026 Q3)
 * Migration guide: See MIGRATION.md
 *
 * ---
 *
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
export class PhotonOpenAPI extends OpenAPIHono {
  /**
   * Helper to create a fully typed route definition.
   */
  static route(config: RouteConfig): RouteConfig {
    return createRoute(config)
  }
}

export { createRoute, z }
