/**
 * Application Routes
 *
 * Define all application routes here.
 */

import type { Router } from '@gravito/core'
import {
  AddressController,
  AdminCategoryController,
  AdminOrderController,
  AdminProductController,
  AdminUserController,
  AuthController,
  CartController,
  CheckoutController,
  DashboardController,
  OrderController,
  PageController,
  ProfileController,
  ShopController,
  WishlistController,
} from './Http/Controllers'
import { AdminMiddleware, AuthMiddleware, GuestMiddleware } from './Http/Middleware'

export function registerRoutes(router: Router) {
  // ─────────────────────────────────────────────────────────────
  // Public Routes
  // ─────────────────────────────────────────────────────────────

  // Home and Shop
  router.get('/', ShopController.index)
  router.get('/products', ShopController.products)
  router.get('/products/:slug', ShopController.show)
  router.get('/category/:slug', ShopController.category)

  router.get('/search', ShopController.search)

  // Support Pages
  router.get('/pages/faq', PageController.faq)
  router.get('/pages/shipping', PageController.shipping)
  router.get('/pages/returns', PageController.returns)
  router.get('/pages/contact', PageController.contact)
  router.get('/pages/news', PageController.news)

  // ─────────────────────────────────────────────────────────────
  // Auth Routes (Guest Only)
  // ─────────────────────────────────────────────────────────────

  router.get('/login', GuestMiddleware, AuthController.showLogin)
  router.post('/login', GuestMiddleware, AuthController.login)
  router.get('/register', GuestMiddleware, AuthController.showRegister)
  router.post('/register', GuestMiddleware, AuthController.register)
  router.post('/logout', AuthController.logout)

  // ─────────────────────────────────────────────────────────────
  // Cart Routes (Public - Session-based)
  // ─────────────────────────────────────────────────────────────

  router.get('/cart', CartController.index)
  router.post('/cart/add', CartController.add)
  router.patch('/cart/update/:itemId', CartController.update)
  router.delete('/cart/remove/:itemId', CartController.remove)
  router.delete('/cart/clear', CartController.clear)
  router.get('/cart/summary', CartController.summary)

  // ─────────────────────────────────────────────────────────────
  // Checkout Routes (Authenticated)
  // ─────────────────────────────────────────────────────────────

  router.get('/checkout', AuthMiddleware, CheckoutController.show)
  router.post('/checkout', AuthMiddleware, CheckoutController.process)
  router.get('/checkout/success', CheckoutController.success)
  router.get('/checkout/cancel', CheckoutController.cancel)

  // ─────────────────────────────────────────────────────────────
  // Webhook Routes
  // ─────────────────────────────────────────────────────────────

  router.post('/webhooks/stripe', CheckoutController.handleWebhook)

  // ─────────────────────────────────────────────────────────────
  // Account Routes (Authenticated)
  // ─────────────────────────────────────────────────────────────

  router.get('/account/orders', AuthMiddleware, OrderController.index)
  router.get('/account/orders/:id', AuthMiddleware, OrderController.show)
  router.post('/account/orders/:id/pay', AuthMiddleware, OrderController.pay)
  router.post('/account/orders/:id/cancel', AuthMiddleware, OrderController.cancel)

  router.get('/account/profile', AuthMiddleware, ProfileController.show)
  router.put('/account/profile', AuthMiddleware, ProfileController.update)
  router.put('/account/password', AuthMiddleware, ProfileController.updatePassword)

  // Wishlist
  router.get('/account/wishlist', AuthMiddleware, WishlistController.index)
  router.post('/account/wishlist', AuthMiddleware, WishlistController.store)
  router.delete('/account/wishlist/:id', AuthMiddleware, WishlistController.destroy)

  // Addresses
  router.get('/account/addresses', AuthMiddleware, AddressController.index)
  router.post('/account/addresses', AuthMiddleware, AddressController.store)
  router.put('/account/addresses/:id/default', AuthMiddleware, AddressController.setDefault)
  router.delete('/account/addresses/:id', AuthMiddleware, AddressController.destroy)

  // ─────────────────────────────────────────────────────────────
  // Admin Routes
  // ─────────────────────────────────────────────────────────────

  // Dashboard
  router.get('/admin', AdminMiddleware, DashboardController.index)

  // Products
  router.get('/admin/products', AdminMiddleware, AdminProductController.index)
  router.get('/admin/products/create', AdminMiddleware, AdminProductController.create)
  router.post('/admin/products', AdminMiddleware, AdminProductController.store)
  router.get('/admin/products/:id/edit', AdminMiddleware, AdminProductController.edit)
  router.put('/admin/products/:id', AdminMiddleware, AdminProductController.update)
  router.delete('/admin/products/:id', AdminMiddleware, AdminProductController.destroy)

  // Categories
  router.get('/admin/categories', AdminMiddleware, AdminCategoryController.index)
  router.post('/admin/categories', AdminMiddleware, AdminCategoryController.store)
  router.put('/admin/categories/:id', AdminMiddleware, AdminCategoryController.update)
  router.delete('/admin/categories/:id', AdminMiddleware, AdminCategoryController.destroy)

  // Orders
  router.get('/admin/orders', AdminMiddleware, AdminOrderController.index)
  router.get('/admin/orders/:id', AdminMiddleware, AdminOrderController.show)
  router.put('/admin/orders/:id/status', AdminMiddleware, AdminOrderController.updateStatus)

  // Users
  router.get('/admin/users', AdminMiddleware, AdminUserController.index)
  router.get('/admin/users/:id', AdminMiddleware, AdminUserController.show)
  router.post('/admin/users/:id/toggle-active', AdminMiddleware, AdminUserController.toggleActive)
}
