import type { GravitoOrbit, PlanetCore } from 'gravito-core'
import { BroadcastChannel } from './channels/BroadcastChannel'
import { DatabaseChannel } from './channels/DatabaseChannel'
import { MailChannel } from './channels/MailChannel'
import { SlackChannel } from './channels/SlackChannel'
import { SmsChannel } from './channels/SmsChannel'
import { NotificationManager } from './NotificationManager'

/**
 * OrbitNotifications options.
 */
export interface OrbitNotificationsOptions {
  /**
   * Enable mail channel.
   */
  enableMail?: boolean

  /**
   * Enable database channel.
   */
  enableDatabase?: boolean

  /**
   * Enable broadcast channel.
   */
  enableBroadcast?: boolean

  /**
   * Enable Slack channel.
   */
  enableSlack?: boolean

  /**
   * Enable SMS channel.
   */
  enableSms?: boolean

  /**
   * Custom channel configuration.
   */
  channels?: Record<string, unknown>
}

/**
 * Notifications Orbit
 *
 * Provides notifications with multiple channels (mail, database, broadcast, Slack, SMS).
 */
export class OrbitNotifications implements GravitoOrbit {
  private options: OrbitNotificationsOptions

  constructor(options: OrbitNotificationsOptions = {}) {
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
   * Configure OrbitNotifications.
   */
  static configure(options: OrbitNotificationsOptions = {}): OrbitNotifications {
    return new OrbitNotifications(options)
  }

  async install(core: PlanetCore): Promise<void> {
    const manager = new NotificationManager(core)

    // Register default channels.
    if (this.options.enableMail) {
      const mail = core.services.get('mail') as
        | {
            send(message: import('./types').MailMessage): Promise<void>
          }
        | undefined

      if (mail) {
        manager.channel('mail', new MailChannel(mail))
      } else {
        core.logger.warn('[OrbitNotifications] Mail service not found, mail channel disabled')
      }
    }

    if (this.options.enableDatabase) {
      const db = core.services.get('db') as
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
        core.logger.warn(
          '[OrbitNotifications] Database service not found, database channel disabled'
        )
      }
    }

    if (this.options.enableBroadcast) {
      const broadcast = core.services.get('broadcast') as
        | {
            broadcast(channel: string, event: string, data: Record<string, unknown>): Promise<void>
          }
        | undefined

      if (broadcast) {
        manager.channel('broadcast', new BroadcastChannel(broadcast))
      } else {
        core.logger.warn(
          '[OrbitNotifications] Broadcast service not found, broadcast channel disabled'
        )
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
        core.logger.warn(
          '[OrbitNotifications] Slack configuration not found, slack channel disabled'
        )
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
        core.logger.warn('[OrbitNotifications] SMS configuration not found, sms channel disabled')
      }
    }

    // Register into core services.
    core.services.set('notifications', manager)

    // Try to integrate with queue system.
    const queue = core.services.get('queue') as
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

    core.logger.info('[OrbitNotifications] Installed')
  }
}
