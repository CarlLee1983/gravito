import type { GravitoContext } from '@gravito/core'
import type { IMemberRepository } from '../../../Domain/Contracts/IMemberRepository'

/**
 * Verify Single Device Middleware
 *
 * Ensures that the current session matches the one stored in the database.
 * If a new login occurs on another device, the old session becomes invalid.
 */
export const verifySingleDevice = async (c: GravitoContext, next: () => Promise<void>) => {
  const core = c.get('core' as any) as any

  // 1. Check if the feature is enabled
  const isEnabled = core.config.get('membership.auth.single_device', false)
  if (!isEnabled) {
    return await next()
  }

  // 2. Get auth and session services
  const auth = core.container.make('auth')
  const session = core.container.make('session')
  const repo = core.container.make('membership.repo') as IMemberRepository

  if (!auth || !session || !repo) {
    return await next()
  }

  // 3. Check if user is logged in
  const user = await auth.guard('web').user()
  if (!user) {
    return await next()
  }

  // 4. Compare current session ID with the one in DB
  const member = await repo.findById(user.id)
  const currentSessionId = session.id()

  if (member?.currentSessionId && member.currentSessionId !== currentSessionId) {
    // Session mismatch! Logout the current session.
    await auth.guard('web').logout()

    // Redirect or throw error
    const i18n = core.container.make('i18n')
    throw new Error(
      i18n?.t('membership.errors.session_expired_other_device') ||
        'Session expired. Logged in from another device.'
    )
  }

  await next()
}
