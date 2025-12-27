import type { Hono } from 'hono'

export class RouterHelper {
  /**
   * Register standard resource routes for a controller.
   *
   * GET    /prefix          -> index
   * GET    /prefix/create   -> create
   * POST   /prefix          -> store
   * GET    /prefix/:id      -> show
   * GET    /prefix/:id/edit -> edit
   * PUT    /prefix/:id      -> update
   * DELETE /prefix/:id      -> destroy
   */
  public static resource(app: Hono<any, any, any>, prefix: string, controller: any) {
    const p = prefix.startsWith('/') ? prefix : `/${prefix}`

    // Mapping: Method -> [HTTP Verb, Path Suffix]
    const routes: Record<string, [string, string]> = {
      index: ['get', ''],
      create: ['get', '/create'],
      store: ['post', ''],
      show: ['get', '/:id'],
      edit: ['get', '/:id/edit'],
      update: ['put', '/:id'],
      destroy: ['delete', '/:id'],
    }

    for (const [method, [verb, suffix]] of Object.entries(routes)) {
      if (typeof controller.prototype[method] === 'function') {
        ;(app as any)[verb](`${p}${suffix}`, controller.call(method))
      }
    }
  }
}
