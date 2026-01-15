import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import { Controller } from '../Controller'

export class DashboardController extends Controller {
  async index(ctx: any) {
    // Get statistics
    const stats = {
      total_events: await DB.table('events').count(),
      total_registrations: await DB.table('registrations').count(),
      total_users: await DB.table('users').count(),
      recent_registrations: await DB.table('registrations')
        .with(['user', 'session.event'])
        .orderBy('created_at', 'desc')
        .limit(10)
        .get(),
    }

    return ctx.inertia('Admin/Dashboard', { stats })
  }
}
