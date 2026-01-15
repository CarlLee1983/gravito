/**
 * Profile Controller
 *
 * User profile management.
 */

import { DB } from '@gravito/atlas'
import type { GravitoContext } from '@gravito/core'
import type { InertiaHelper } from '@gravito/ion'
import type { SessionService } from '@gravito/pulsar'
import type { AuthManager } from '@gravito/sentinel'
import { sql } from '../../utils/db'

export class ProfileController {
  /**
   * Show profile
   */
  static async show(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as unknown as InertiaHelper
    const auth = ctx.get('auth') as AuthManager

    const user = await auth.user()
    if (!user) {
      return ctx.redirect('/login')
    }

    const userId = user.getAuthIdentifier() as number
    const userResult = await DB.raw<{
      id: number
      name: string
      email: string
      created_at: string
    }>(sql('SELECT id, name, email, created_at FROM users WHERE id = ?'), [userId])

    return inertia.render('Account/Profile', {
      user: userResult.rows[0],
    })
  }

  /**
   * Update profile
   */
  static async update(ctx: GravitoContext) {
    const auth = ctx.get('auth') as AuthManager
    const session = ctx.get('session') as SessionService

    const user = await auth.user()
    if (!user) {
      return ctx.json({ error: '請先登入' }, 401)
    }

    const userId = user.getAuthIdentifier() as number
    const body = (await ctx.req.json()) as { name: string; email: string }

    const errors: Record<string, string[]> = {}

    // Validation
    if (!body.name || body.name.length < 2) {
      errors.name = ['姓名至少需要 2 個字元']
    }

    if (!body.email || !body.email.includes('@')) {
      errors.email = ['請輸入有效的電子郵件']
    } else {
      // Check if email exists (for other users)
      const existingResult = await DB.raw<{ id: number }>(
        sql('SELECT id FROM users WHERE email = ? AND id != ?'),
        [body.email, userId]
      )
      if (existingResult.rows[0]) {
        errors.email = ['此電子郵件已被使用']
      }
    }

    if (Object.keys(errors).length > 0) {
      return ctx.json({ errors }, 422)
    }

    await DB.raw(
      sql('UPDATE users SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
      [body.name, body.email, userId]
    )

    session.flash('success', '個人資料已更新')
    session.flash('success', '個人資料已更新')
    return ctx.redirect('/account/profile')
  }

  /**
   * Update password
   */
  static async updatePassword(ctx: GravitoContext) {
    const auth = ctx.get('auth') as AuthManager
    const session = ctx.get('session') as SessionService

    const user = await auth.user()
    if (!user) {
      return ctx.json({ error: '請先登入' }, 401)
    }

    const userId = user.getAuthIdentifier() as number
    const body = (await ctx.req.json()) as {
      current_password: string
      new_password: string
      new_password_confirmation: string
    }

    const errors: Record<string, string[]> = {}

    // Get current password
    const userResult = await DB.raw<{ password: string }>(
      sql('SELECT password FROM users WHERE id = ?'),
      [userId]
    )
    const userData = userResult.rows[0]

    // Verify current password
    const valid = await Bun.password.verify(body.current_password, userData.password)
    if (!valid) {
      errors.current_password = ['目前密碼不正確']
    }

    if (!body.new_password || body.new_password.length < 6) {
      errors.new_password = ['新密碼至少需要 6 個字元']
    }

    if (body.new_password !== body.new_password_confirmation) {
      errors.new_password_confirmation = ['密碼確認不符']
    }

    if (Object.keys(errors).length > 0) {
      return ctx.json({ errors }, 422)
    }

    const hashedPassword = await Bun.password.hash(body.new_password, { algorithm: 'bcrypt' })
    await DB.raw(
      sql('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
      [hashedPassword, userId]
    )

    session.flash('success', '密碼已更新')
    session.flash('success', '密碼已更新')
    return ctx.redirect('/account/profile')
  }
}
