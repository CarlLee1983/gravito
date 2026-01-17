import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import { BroadcastChannel } from './channels/BroadcastChannel'
import { DatabaseChannel } from './channels/DatabaseChannel'
import { MailChannel } from './channels/MailChannel'
import { SlackChannel } from './channels/SlackChannel'
import { SmsChannel } from './channels/SmsChannel'
import { NotificationManager } from './NotificationManager'

/**
 * OrbitFlare options.
 */
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

  /**
   * Install OrbitFlare into PlanetCore.
   *
   * @param core - The PlanetCore instance.
   */
  async install(core: PlanetCore): Promise<void> {
    const manager = new NotificationManager(core)

    // Register default channels.
    if (this.options.enableMail) {
      const mail = core.container.make('mail') as
        | {
          send(message: import('./types').MailMessage): Promise<void>
        }
        | undefined

      if (mail) {
        manager.channel('mail', new MailChannel(mail))
      } else {
        core.logger.warn('[OrbitFlare] Mail service not found, mail channel disabled')
      }
    }

    if (this.options.enableDatabase) {
      const db = core.container.make('db') as
        | {
          insertNotification(data: {
            notifiableId: string | number
            notifiableType: string
            type: string
            data: Record<string, unknown>
          }): Promise<void>
        }
        | undefined

      if (db) {
        manager.channel('database', new DatabaseChannel(db))
      } else {
        core.logger.warn('[OrbitFlare] Database service not found, database channel disabled')
      }
    }

    if (this.options.enableBroadcast) {
      const broadcast = core.container.make('broadcast') as
        | {
          broadcast(channel: string, event: string, data: Record<string, unknown>): Promise<void>
        }
        | undefined

      if (broadcast) {
        manager.channel('broadcast', new BroadcastChannel(broadcast))
      } else {
        core.logger.warn('[OrbitFlare] Broadcast service not found, broadcast channel disabled')
      }
    }

    if (this.options.enableSlack) {
      const slack = this.options.channels?.slack as
        | {
          webhookUrl: string
          defaultChannel?: string
        }
        | undefined

      if (slack) {
        manager.channel('slack', new SlackChannel(slack))
      } else {
        core.logger.warn('[OrbitFlare] Slack configuration not found, slack channel disabled')
      }
    }

    if (this.options.enableSms) {
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

    // Register into core container
    core.container.instance('notifications', manager)

    // Try to integrate with queue system.
    const queue = core.container.make('queue') as
      | {
        push(job: unknown, queue?: string, connection?: string, delay?: number): Promise<void>
      }
      | undefined

    if (queue) {
      manager.setQueueManager({
        push: async (job, queueName, connection, delay) => {
          await queue.push(job, queueName, connection, delay)
        },
      })
    }

    core.logger.info('[OrbitFlare] Installed')
  }
}

// Module augmentation for GravitoVariables
declare module '@gravito/core' {
  interface GravitoVariables {
    /** Notification manager for multi-channel notifications */
    notifications?: NotificationManager
  }
}
