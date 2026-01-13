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
  router.get('/profile', [ProfileController, 'index'])
  router.get('/profile/registrations/:id', [ProfileController, 'showRegistration'])
  router.post('/registrations', [RegistrationController, 'store'])
  router.delete('/registrations/:id', [RegistrationController, 'destroy'])

  // Check-in routes
  router.get('/checkin', [CheckinController, 'index'])
  router.post('/checkin/verify', [CheckinController, 'verify'])
  router.post('/checkin/:qrCode', [CheckinController, 'checkin'])

  // Admin routes
  router.get('/admin', [DashboardController, 'index'])

  // Admin Events
  router.get('/admin/events', [AdminEventController, 'index'])
  router.get('/admin/events/create', [AdminEventController, 'create'])
  router.post('/admin/events', [AdminEventController, 'store'])
  router.get('/admin/events/:id/edit', [AdminEventController, 'edit'])
  router.post('/admin/events/:id/update', [AdminEventController, 'update'])
  router.delete('/admin/events/:id', [AdminEventController, 'destroy'])

  // Admin Sessions
  router.get('/admin/events/:eventId/sessions', [SessionController, 'index'])
  router.post('/admin/events/:eventId/sessions', [SessionController, 'store'])
  router.put('/admin/sessions/:id', [SessionController, 'update'])
  router.delete('/admin/sessions/:id', [SessionController, 'destroy'])

  // Admin Custom Fields
  router.get('/admin/events/:eventId/fields', [FieldController, 'index'])
  router.post('/admin/events/:eventId/fields', [FieldController, 'store'])
  router.put('/admin/fields/:id', [FieldController, 'update'])
  router.delete('/admin/fields/:id', [FieldController, 'destroy'])
  router.put('/admin/events/:eventId/fields/reorder', [FieldController, 'reorder'])

  // Admin Registrations
  router.get('/admin/registrations', [AdminRegistrationController, 'index'])
  router.get('/admin/registrations/:id', [AdminRegistrationController, 'show'])
  router.put('/admin/registrations/:id/status', [AdminRegistrationController, 'updateStatus'])
  router.post('/admin/registrations/:id/resend', [AdminRegistrationController, 'resendEmail'])
  router.get('/admin/registrations/export', [AdminRegistrationController, 'export'])

  // Admin Users
  router.get('/admin/users', [UserController, 'index'])
}
