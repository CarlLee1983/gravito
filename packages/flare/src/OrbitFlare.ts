import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import { BroadcastChannel } from './channels/BroadcastChannel'
import { DatabaseChannel } from './channels/DatabaseChannel'
import { MailChannel } from './channels/MailChannel'
import { SlackChannel } from './channels/SlackChannel'
import { SmsChannel } from './channels/SmsChannel'
import { NotificationManager } from './NotificationManager'
import type {
  BroadcastService,
  DatabaseService,
  MailService,
  NotificationPreference,
  QueueService,
} from './types'
import type { ChannelMiddleware } from './types/middleware'

/**
 * Options for configuring OrbitFlare.
 * @public
 */
export interface OrbitFlareOptions {
  /** Enable or disable the email notification channel. */
  enableMail?: boolean
  /** Enable or disable the database storage notification channel. */
  enableDatabase?: boolean
  /** Enable or disable the real-time broadcast notification channel. */
  enableBroadcast?: boolean
  /** Enable or disable the Slack notification channel. */
  enableSlack?: boolean
  /** Enable or disable the SMS notification channel. */
  enableSms?: boolean
  /** Custom channel configuration records for flexible extension. */
  channels?: Record<string, unknown>
  /** Channel middleware to apply to all notifications. */
  middleware?: ChannelMiddleware[]
  /** Custom notification preference provider. */
  preferenceProvider?: NotificationPreference
  /** Enable automatic preference filtering middleware (default: false). */
  enablePreference?: boolean
}

/**
 * OrbitFlare is the official notification orbit for Gravito.
 * It provides a unified API for sending notifications across multiple channels
 * (Mail, Database, Broadcast, Slack, SMS) and supports background queuing.
 *
 * @example
 * ```typescript
 * const flare = new OrbitFlare({
 *   enableSlack: true,
 *   channels: { slack: { webhookUrl: '...' } }
 * });
 * core.addOrbit(flare);
 *
 * // Usage in controller
 * await ctx.get('notifications').send(user, new WelcomeNotification());
 * ```
 * @public
 */
export class OrbitFlare implements GravitoOrbit {
  private options: OrbitFlareOptions

  constructor(options: OrbitFlareOptions = {}) {
    this.validateOptions(options)
    this.options = {
      enableMail: true,
      enableDatabase: true,
      enableBroadcast: true,
      enableSlack: false,
      enableSms: false,
      ...options,
    }
  }

  /**
   * Configure OrbitFlare.
   *
   * @param options - The OrbitFlare configuration options.
   * @returns A new OrbitFlare instance.
   */
  static configure(options: OrbitFlareOptions = {}): OrbitFlare {
    return new OrbitFlare(options)
  }

  private validateOptions(options: OrbitFlareOptions): void {
    if (options.enableSlack) {
      const slack = options.channels?.slack as { webhookUrl?: string } | undefined
      if (!slack?.webhookUrl) {
        throw new Error(
          '[OrbitFlare] Slack channel enabled but webhookUrl not provided. ' +
            'Configure channels.slack.webhookUrl or set enableSlack to false.'
        )
      }
      if (!this.isValidUrl(slack.webhookUrl)) {
        throw new Error(`[OrbitFlare] Invalid Slack webhook URL: ${slack.webhookUrl}`)
      }
    }

    if (options.enableSms) {
      const sms = options.channels?.sms as { provider?: string } | undefined
      if (!sms?.provider) {
        throw new Error(
          '[OrbitFlare] SMS channel enabled but provider not specified. ' +
            'Configure channels.sms.provider or set enableSms to false.'
        )
      }
      const supportedProviders = ['twilio', 'aws-sns']
      if (!supportedProviders.includes(sms.provider)) {
        throw new Error(
          `[OrbitFlare] Unsupported SMS provider: ${sms.provider}. ` +
            `Supported providers: ${supportedProviders.join(', ')}`
        )
      }
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Install OrbitFlare into PlanetCore.
   *
   * @param core - The PlanetCore instance.
   */
  async install(core: PlanetCore): Promise<void> {
    const manager = new NotificationManager(core)

    // Register default channels.
    if (this.options.enableMail) {
      this.setupMailChannel(core, manager)
    }

    if (this.options.enableDatabase) {
      this.setupDatabaseChannel(core, manager)
    }

    if (this.options.enableBroadcast) {
      this.setupBroadcastChannel(core, manager)
    }

    if (this.options.enableSlack) {
      this.setupSlackChannel(core, manager)
    }

    if (this.options.enableSms) {
      this.setupSmsChannel(core, manager)
    }

    // Register middleware
    this.setupMiddleware(core, manager)

    // Register into core container
    core.container.instance('notifications', manager)

    // Try to integrate with queue system.
    this.setupQueueIntegration(core, manager)

    core.logger.info('[OrbitFlare] Installed')
  }

  private setupMailChannel(core: PlanetCore, manager: NotificationManager): void {
    const mail = core.container.make<MailService>('mail')

    if (mail && this.isMailService(mail)) {
      manager.channel('mail', new MailChannel(mail))
    } else {
      core.logger.warn('[OrbitFlare] Mail service not found or invalid, mail channel disabled')
    }
  }

  private setupDatabaseChannel(core: PlanetCore, manager: NotificationManager): void {
    const db = core.container.make<DatabaseService>('db')
    const config = this.options.channels?.database as any

    if (db && this.isDatabaseService(db)) {
      manager.channel('database', new DatabaseChannel(db, config))
    } else {
      core.logger.warn(
        '[OrbitFlare] Database service not found or invalid, database channel disabled'
      )
    }
  }

  private setupBroadcastChannel(core: PlanetCore, manager: NotificationManager): void {
    const broadcast = core.container.make<BroadcastService>('broadcast')
    const config = this.options.channels?.broadcast as any

    if (broadcast && this.isBroadcastService(broadcast)) {
      manager.channel('broadcast', new BroadcastChannel(broadcast, config))
    } else {
      core.logger.warn(
        '[OrbitFlare] Broadcast service not found or invalid, broadcast channel disabled'
      )
    }
  }

  private setupSlackChannel(_core: PlanetCore, manager: NotificationManager): void {
    const slack = this.options.channels?.slack as
      | {
          webhookUrl: string
          defaultChannel?: string
        }
      | undefined

    if (slack) {
      manager.channel('slack', new SlackChannel(slack))
    }
  }

  private setupSmsChannel(core: PlanetCore, manager: NotificationManager): void {
    const sms = this.options.channels?.sms as
      | {
          provider: string
          apiKey?: string
          apiSecret?: string
          from?: string
        }
      | undefined

    if (sms) {
      manager.channel('sms', new SmsChannel(sms))
    } else {
      core.logger.warn('[OrbitFlare] SMS configuration not found, sms channel disabled')
    }
  }

  private setupQueueIntegration(core: PlanetCore, manager: NotificationManager): void {
    const queue = core.container.make<QueueService>('queue')

    if (queue && this.isQueueService(queue)) {
      manager.setQueueManager({
        push: async (job, queueName, connection, delay) => {
          await queue.push(job, queueName, connection, delay)
        },
      })
    }
  }

  private setupMiddleware(core: PlanetCore, manager: NotificationManager): void {
    // Register custom middleware
    if (this.options.middleware) {
      for (const middleware of this.options.middleware) {
        manager.use(middleware)
      }
    }

    // Automatically register PreferenceMiddleware if enabled
    if (this.options.enablePreference) {
      // Dynamic import to avoid circular dependency
      const { PreferenceMiddleware } = require('./middleware/PreferenceMiddleware')
      const preferenceMiddleware = new PreferenceMiddleware(this.options.preferenceProvider)
      manager.use(preferenceMiddleware)
      core.logger.info('[OrbitFlare] Preference middleware enabled')
    }
  }

  private isMailService(service: unknown): service is MailService {
    return (
      typeof service === 'object' &&
      service !== null &&
      'send' in service &&
      typeof (service as MailService).send === 'function'
    )
  }

  private isDatabaseService(service: unknown): service is DatabaseService {
    return (
      typeof service === 'object' &&
      service !== null &&
      'insertNotification' in service &&
      typeof (service as DatabaseService).insertNotification === 'function'
    )
  }

  private isBroadcastService(service: unknown): service is BroadcastService {
    return (
      typeof service === 'object' &&
      service !== null &&
      'broadcast' in service &&
      typeof (service as BroadcastService).broadcast === 'function'
    )
  }

  private isQueueService(service: unknown): service is QueueService {
    return (
      typeof service === 'object' &&
      service !== null &&
      'push' in service &&
      typeof (service as QueueService).push === 'function'
    )
  }
}

// Module augmentation for GravitoVariables
declare module '@gravito/core' {
  interface GravitoVariables {
    /** Notification manager for multi-channel notifications */
    notifications?: NotificationManager
  }
}
