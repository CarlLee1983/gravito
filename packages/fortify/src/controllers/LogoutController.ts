import type { GravitoContext } from 'gravito-core'
import { AuthManager } from '@gravito/sentinel'
import type { FortifyConfig } from '../config'

/**
 * LogoutController handles user logout
 */
export class LogoutController {
    constructor(private config: FortifyConfig) { }

    /**
     * Handle logout
     * POST /logout
     */
    async destroy(c: GravitoContext): Promise<Response> {
        const auth = c.get('auth') as AuthManager

        if (auth) {
            try {
                await auth.logout()
            } catch (error) {
                console.error('[Fortify] Logout error:', error)
            }
        }

        if (this.config.jsonMode) {
            return c.json({
                message: 'Logged out successfully',
                redirect: this.config.redirects.logout ?? '/'
            })
        }

        return c.redirect(this.config.redirects.logout ?? '/')
    }
}
