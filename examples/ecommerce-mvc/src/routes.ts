/**
 * Application Routes
 *
 * Define all application routes here.
 */

import type { Router } from '@gravito/core'
import { ProductController } from './Http/Controllers/ProductController'
import { StoreProductRequest } from './Http/Requests/StoreProductRequest'

export function registerRoutes(router: Router) {
  // Welcome route
  router.get('/', (c) => c.text('Welcome to Gravito E-Commerce! 🌌'))

  // Product routes
  router.get('/products', ProductController.call('index'))
  router.get('/products/:id', ProductController.call('show'))
  router.post('/products', StoreProductRequest.middleware(), ProductController.call('store'))
}
