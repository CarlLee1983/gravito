import type { GravitoContext, GravitoMiddleware, GravitoNext } from 'gravito-core'
import { AuthManager } from '@gravito/sentinel'

/**
 * Middleware to ensure user has verified their email
 * 
 * @example
 * ```typescript
 * router.middleware(verified).group((r) => {
 *   r.get('/dashboard', dashboardHandler)
 * })
 * ```
 */
export const verified: GravitoMiddleware = async (c: GravitoContext, next: GravitoNext) => {
    const auth = c.get('auth') as AuthManager

    if (!auth) {
        return c.json({ error: 'Authentication service not available' }, 500)
    }

    const user = await auth.user() as any

    if (!user) {
        return c.redirect('/login')
    }

    if (!user.email_verified_at) {
        // Check if request wants JSON
        const accept = c.req.header('Accept') ?? ''
        if (accept.includes('application/json')) {
            return c.json({ error: 'Email not verified' }, 403)
        }
        return c.redirect('/verify-email')
    }

    await next()
    return undefined
}
