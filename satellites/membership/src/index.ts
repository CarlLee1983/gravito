import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Container, ServiceProvider } from '@gravito/core'
import { auth } from '@gravito/sentinel'
import { ForgotPasswordMail } from './Application/Mail/ForgotPasswordMail'
import { MemberLevelChangedMail } from './Application/Mail/MemberLevelChangedMail'
import { WelcomeMail } from './Application/Mail/WelcomeMail'
import type { PasskeysConfig } from './Application/Services/PasskeysService'
import { PasskeysService } from './Application/Services/PasskeysService'
import { ForgotPassword } from './Application/UseCases/ForgotPassword'
import { LoginMember } from './Application/UseCases/LoginMember'
import { RegisterMember } from './Application/UseCases/RegisterMember'
import { ResetPassword } from './Application/UseCases/ResetPassword'
import { UpdateMemberLevel } from './Application/UseCases/UpdateMemberLevel'
import { UpdateSettings } from './Application/UseCases/UpdateSettings'
import { VerifyEmail } from './Application/UseCases/VerifyEmail'
import { SentinelMemberProvider } from './Infrastructure/Auth/SentinelMemberProvider'
import { AtlasMemberPasskeyRepository } from './Infrastructure/Persistence/AtlasMemberPasskeyRepository'
import { AtlasMemberRepository } from './Infrastructure/Persistence/AtlasMemberRepository'
import { PasskeyController } from './Interface/Http/Controllers/PasskeyController'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

/**
 * Membership Satellite Service Provider
 *
 * Handles the registration and initialization of membership services.
 * Optimized for Bun runtime with full i18n support.
 */
export class MembershipServiceProvider extends ServiceProvider {
  /**
   * Register bindings in the container
   */
  register(container: Container): void {
    if (!container.has('cache')) {
      const cacheFromServices = this.core?.services.get('cache')
      if (cacheFromServices) {
        container.instance('cache', cacheFromServices)
      }
    }

    // Bind Repository
    container.singleton('membership.repo', () => new AtlasMemberRepository())

    // Bind Sentinel Auth Provider (Dogfooding Sentinel)
    container.singleton(
      'auth.member_provider',
      () => new SentinelMemberProvider(container.make('membership.repo'))
    )

    // Bind UseCases
    container.singleton('membership.register', () => {
      return new RegisterMember(container.make('membership.repo'), this.core!)
    })

    container.singleton('membership.login', () => {
      return new LoginMember(container.make('membership.repo'), this.core!)
    })

    container.singleton('membership.forgot-password', () => {
      return new ForgotPassword(container.make('membership.repo'), this.core!)
    })

    container.singleton('membership.reset-password', () => {
      return new ResetPassword(container.make('membership.repo'), this.core!)
    })

    container.singleton('membership.verify-email', () => {
      return new VerifyEmail(container.make('membership.repo'))
    })

    container.singleton('membership.update-settings', () => {
      return new UpdateSettings(container.make('membership.repo'), this.core!)
    })

    container.singleton('membership.update-level', () => {
      return new UpdateMemberLevel(container.make('membership.repo'), this.core!)
    })

    container.singleton('membership.passkeys.repo', () => new AtlasMemberPasskeyRepository())

    container.singleton('membership.passkeys.service', () => {
      return new PasskeysService(
        container.make('membership.passkeys.repo'),
        this.buildPasskeysConfig()
      )
    })

    container.singleton('membership.passkeys.controller', () => {
      return new PasskeyController(
        container.make('membership.passkeys.service'),
        container.make('membership.repo')
      )
    })
  }

  /**
   * Expose migration path using Bun-native __dirname
   */
  getMigrationsPath(): string {
    return `${__dirname}/Infrastructure/Persistence/Migrations`
  }

  /**
   * Boot the satellite
   * Loads local translations into the global i18n system.
   */
  override async boot(): Promise<void> {
    const logger = this.core?.logger
    const i18n = this.core?.container.make<any>('i18n')

    if (i18n) {
      try {
        // Standard Node.js compatible JSON loading
        const en = JSON.parse(readFileSync(join(__dirname, '../locales/en.json'), 'utf-8'))
        const zhTW = JSON.parse(readFileSync(join(__dirname, '../locales/zh-TW.json'), 'utf-8'))

        i18n.addResource('en', 'membership', en)
        i18n.addResource('zh-TW', 'membership', zhTW)
      } catch (_err) {
        logger?.warn('[Membership] Failed to load localizations')
      }
    }

    // Register Hooks
    if (this.core) {
      this.core.hooks.addAction(
        'membership:send-verification',
        async (data: { email: string; token: string }) => {
          try {
            const mail = this.core?.container.make<any>('mail')
            if (mail) {
              await mail.queue(new WelcomeMail(data.email, data.token))
            }
          } catch (err) {
            this.core?.logger.error('[Membership] Failed to send verification email', err)
          }
        }
      )

      this.core.hooks.addAction(
        'membership:send-reset-password',
        async (data: { email: string; token: string }) => {
          try {
            const mail = this.core?.container.make<any>('mail')
            if (mail) {
              await mail.queue(new ForgotPasswordMail(data.email, data.token))
            }
          } catch (err) {
            this.core?.logger.error('[Membership] Failed to send reset password email', err)
          }
        }
      )

      this.core.hooks.addAction(
        'membership:level-changed',
        async (data: { email: string; oldLevel: string; newLevel: string }) => {
          try {
            const mail = this.core?.container.make<any>('mail')
            if (mail) {
              await mail.queue(new MemberLevelChangedMail(data.email, data.oldLevel, data.newLevel))
            }
          } catch (err) {
            this.core?.logger.error('[Membership] Failed to send level change email', err)
          }
        }
      )
    }

    if (this.core) {
      const passkeyController = this.core.container.make(
        'membership.passkeys.controller'
      ) as PasskeyController
      const passkeyRoutes = this.core.router.prefix('/api/membership/passkeys')
      passkeyRoutes.post('/login/options', (c) => passkeyController.loginOptions(c))
      passkeyRoutes.post('/login/verify', (c) => passkeyController.verifyAuthentication(c))

      const protectedRoutes = passkeyRoutes.middleware(auth())
      protectedRoutes.post('/register/options', (c) => passkeyController.registrationOptions(c))
      protectedRoutes.post('/register/verify', (c) => passkeyController.verifyRegistration(c))
    }

    const startMsg =
      i18n?.t('membership.notifications.operational') || '🛰️ Satellite Membership is operational'
    logger?.info(startMsg)
  }

  private buildPasskeysConfig(): PasskeysConfig {
    const config = this.core?.config

    const readString = (key: string): string | undefined => {
      const value = config?.get(key)
      return typeof value === 'string' ? value : undefined
    }

    const origin =
      readString('membership.passkeys.origin') ??
      readString('APP_URL') ??
      process.env.APP_URL ??
      'http://localhost:3000'

    const rpID =
      readString('membership.passkeys.rp_id') ??
      (() => {
        try {
          return new URL(origin).hostname
        } catch {
          return origin
        }
      })()

    const rpName = readString('membership.passkeys.name') ?? 'Gravito Membership'
    const timeoutValue = config?.get('membership.passkeys.timeout')
    const timeout =
      typeof timeoutValue === 'number'
        ? timeoutValue
        : typeof timeoutValue === 'string'
          ? Number(timeoutValue)
          : 60000

    const userVerification = readString('membership.passkeys.user_verification') ?? 'preferred'
    const attestation = readString('membership.passkeys.attestation') ?? 'none'

    return {
      rpName,
      rpID,
      origin,
      timeout,
      userVerification: userVerification as PasskeysConfig['userVerification'],
      attestationType: attestation as PasskeysConfig['attestationType'],
    }
  }
}
