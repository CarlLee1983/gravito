import type { Router } from '@gravito/core'
// Admin Controllers
import { DashboardController } from './Http/Controllers/Admin/DashboardController'
import { EventController as AdminEventController } from './Http/Controllers/Admin/EventController'
import { FieldController } from './Http/Controllers/Admin/FieldController'
import { RegistrationController as AdminRegistrationController } from './Http/Controllers/Admin/RegistrationController'
import { SessionController } from './Http/Controllers/Admin/SessionController'
import { UserController } from './Http/Controllers/Admin/UserController'
import { AuthController } from './Http/Controllers/AuthController'
import { CheckinController } from './Http/Controllers/CheckinController'
import { EventController } from './Http/Controllers/EventController'
// Public Controllers
import { HomeController } from './Http/Controllers/HomeController'
import { ProfileController } from './Http/Controllers/ProfileController'
import { RegistrationController } from './Http/Controllers/RegistrationController'

// Static Page Controller
import { StaticPageController } from './Http/Controllers/StaticPageController'

// Middleware
import { AdminMiddleware } from './Http/Middleware/AdminMiddleware'
import { AuthMiddleware } from './Http/Middleware/AuthMiddleware'

export function registerRoutes(router: Router): void {
  // Public routes
  router.get('/', [HomeController, 'index'])
  router.get('/events', [EventController, 'index'])
  router.get('/events/:id', [EventController, 'show'])

  // Info routes
  router.get('/docs', [StaticPageController, 'docs'])
  router.get('/status', [StaticPageController, 'status'])
  router.get('/help', [StaticPageController, 'help'])
  router.get('/terms', [StaticPageController, 'terms'])
  router.get('/privacy', [StaticPageController, 'privacy'])

  // Auth routes
  router.get('/login', [AuthController, 'showLogin'])
  router.post('/login', [AuthController, 'login'])
  router.get('/register', [AuthController, 'showRegister'])
  router.post('/register', [AuthController, 'register'])
  router.post('/logout', [AuthController, 'logout'])

  // User routes (authenticated)
  router.get('/profile', AuthMiddleware, [ProfileController, 'index'])
  router.get('/profile/registrations/:id', AuthMiddleware, [ProfileController, 'showRegistration'])
  router.post('/registrations', AuthMiddleware, [RegistrationController, 'store'])
  router.delete('/registrations/:id', AuthMiddleware, [RegistrationController, 'destroy'])

  // Check-in routes
  router.get('/checkin', AuthMiddleware, [CheckinController, 'index'])
  router.post('/checkin/verify', AuthMiddleware, [CheckinController, 'verify'])
  router.post('/checkin/:qrCode', AuthMiddleware, [CheckinController, 'checkin'])

  // Admin routes
  const adminAuth = [AuthMiddleware, AdminMiddleware]

  router.get('/admin', adminAuth, [DashboardController, 'index'])

  // Admin Events
  router.get('/admin/events', adminAuth, [AdminEventController, 'index'])
  router.get('/admin/events/create', adminAuth, [AdminEventController, 'create'])
  router.post('/admin/events', adminAuth, [AdminEventController, 'store'])
  router.get('/admin/events/:id/edit', adminAuth, [AdminEventController, 'edit'])
  router.post('/admin/events/:id/update', adminAuth, [AdminEventController, 'update'])
  router.delete('/admin/events/:id', adminAuth, [AdminEventController, 'destroy'])

  // Admin Sessions
  router.get('/admin/events/:eventId/sessions', adminAuth, [SessionController, 'index'])
  router.post('/admin/events/:eventId/sessions', adminAuth, [SessionController, 'store'])
  router.post('/admin/sessions/:id/update', adminAuth, [SessionController, 'update'])
  router.delete('/admin/sessions/:id', adminAuth, [SessionController, 'destroy'])

  // Admin Custom Fields
  router.get('/admin/events/:eventId/fields', adminAuth, [FieldController, 'index'])
  router.post('/admin/events/:eventId/fields', adminAuth, [FieldController, 'store'])
  router.post('/admin/fields/:id/update', adminAuth, [FieldController, 'update'])
  router.delete('/admin/fields/:id', adminAuth, [FieldController, 'destroy'])
  router.post('/admin/events/:eventId/fields/reorder', adminAuth, [FieldController, 'reorder'])

  // Admin Registrations
  router.get('/admin/registrations', adminAuth, [AdminRegistrationController, 'index'])
  router.get('/admin/registrations/:id', adminAuth, [AdminRegistrationController, 'show'])
  router.put('/admin/registrations/:id/status', adminAuth, [
    AdminRegistrationController,
    'updateStatus',
  ])
  router.post('/admin/registrations/:id/resend', adminAuth, [
    AdminRegistrationController,
    'resendEmail',
  ])
  router.get('/admin/registrations/export', adminAuth, [AdminRegistrationController, 'export'])

  // Admin Users
  router.get('/admin/users', adminAuth, [UserController, 'index'])
}
