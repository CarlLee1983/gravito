import type { GravitoOrbit, PlanetCore } from 'gravito-core'
import { DevMailbox } from './dev/DevMailbox'
import { DevServer } from './dev/DevServer'
import type { Mailable } from './Mailable'
import { LogTransport } from './transports/LogTransport'
import { MemoryTransport } from './transports/MemoryTransport'
import type { MailConfig, Message } from './types'

export class OrbitMail implements GravitoOrbit {
  private static instance?: OrbitMail
  private config: MailConfig
  private devMailbox?: DevMailbox

  private constructor(config: MailConfig) {
    this.config = config
    OrbitMail.instance = this
  }

  /**
   * Get the singleton instance of OrbitMail
   */
  static getInstance(): OrbitMail {
    if (!OrbitMail.instance) {
      throw new Error('OrbitMail has not been initialized. Call OrbitMail.configure() first.')
    }
    return OrbitMail.instance
  }

  /**
   * Configure the OrbitMail instance
   */
  static configure(config: MailConfig): OrbitMail {
    // Basic validation
    if (!config.transport && !config.devMode) {
      console.warn('[OrbitMail] No transport provided, falling back to LogTransport')
      config.transport = new LogTransport()
    }
    return new OrbitMail(config)
  }

  /**
   * Install the orbit into PlanetCore
   */
  install(core: PlanetCore): void {
    core.logger.info('[OrbitMail] Initializing Mail Service (Exposed as: mail)')

    // In Dev Mode, override transport and setup Dev Server
    if (this.config.devMode) {
      this.devMailbox = new DevMailbox()
      // Only override if not explicitly set to something else, or maybe ALWAYS override in devMode?
      // Usually devMode implies intercepting all mails.
      // But let's log a warning if we are overriding a real transport

      this.config.transport = new MemoryTransport(this.devMailbox)
      core.logger.info('[OrbitMail] Dev Mode Enabled: Emails will be intercepted to Dev Mailbox')

      const devServer = new DevServer(this.devMailbox, this.config.devUiPrefix || '/__mail')
      devServer.register(core)
    }

    // Inject mail service into context
    core.app.use('*', async (c, next) => {
      // @ts-expect-error: Extending Hono Context dynamically
      c.set('mail', {
        send: (mailable: Mailable) => this.send(mailable),
        queue: (mailable: Mailable) => this.queue(mailable),
      })
      await next()
    })
  }

  /**
   * Send a mailable instance
   */
  async send(mailable: Mailable): Promise<void> {
    // 1. Build envelope and get configuration
    const envelope = await mailable.buildEnvelope(this.config)

    // Validate required fields
    if (!envelope.from) {
      throw new Error('Message is missing "from" address')
    }
    if (!envelope.to || envelope.to.length === 0) {
      throw new Error('Message is missing "to" address')
    }

    // 2. Render content
    const content = await mailable.renderContent()

    // 3. Construct full message
    const message: Message = {
      ...envelope,
      from: envelope.from!,
      to: envelope.to!,
      subject: envelope.subject || '(No Subject)',
      priority: envelope.priority || 'normal',
      html: content.html,
    }

    if (content.text) {
      message.text = content.text
    }

    // 4. Send via transport
    await this.config.transport.send(message)
  }

  /**
   * Queue a mailable instance
   *
   * Push a mailable into the queue for execution.
   * Requires OrbitQueue to be installed and available in the context.
   */
  async queue(mailable: Mailable): Promise<void> {
    // Try to get queue service from context.
    // If not available, send immediately (backward compatible).
    const queue = (
      this as unknown as { queueService?: { push: (job: unknown) => Promise<unknown> } }
    ).queueService

    if (queue) {
      // Push via Queue system.
      await queue.push(mailable)
    } else {
      // Fallback: send immediately (backward compatible).
      console.warn(
        '[OrbitMail] Queue service not available, sending immediately. Install OrbitQueue to enable queuing.'
      )
      await this.send(mailable)
    }
  }
}
