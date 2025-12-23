import type { GravitoOrbit, PlanetCore } from 'gravito-core'
import { DevMailbox } from './dev/DevMailbox'
import { DevServer } from './dev/DevServer'
import type { Mailable } from './Mailable'
import { LogTransport } from './transports/LogTransport'
import { MemoryTransport } from './transports/MemoryTransport'
import type { MailConfig, Message } from './types'

export class OrbitSignal implements GravitoOrbit {
  private static instance?: OrbitSignal
  private config: MailConfig
  private devMailbox?: DevMailbox

  constructor(config: MailConfig = {}) {
    this.config = config
    OrbitSignal.instance = this
  }

  /**
   * Get the singleton instance of OrbitSignal
   *
   * @returns The singleton instance of OrbitSignal.
   * @throws {Error} If OrbitSignal has not been initialized.
   */
  static getInstance(): OrbitSignal {
    if (!OrbitSignal.instance) {
      throw new Error('OrbitSignal has not been initialized. Call OrbitSignal.configure() first.')
    }
    return OrbitSignal.instance
  }

  /**
   * Configure the OrbitSignal instance
   *
   * @param config - The mail configuration object.
   * @returns A new instance of OrbitSignal.
   */
  static configure(config: MailConfig): OrbitSignal {
    // Basic validation
    if (!config.transport && !config.devMode) {
      console.warn('[OrbitSignal] No transport provided, falling back to LogTransport')
      config.transport = new LogTransport()
    }
    return new OrbitSignal(config)
  }

  /**
   * Install the orbit into PlanetCore
   *
   * @param core - The PlanetCore instance.
   */
  install(core: PlanetCore): void {
    core.logger.info('[OrbitSignal] Initializing Mail Service (Exposed as: mail)')

    // Ensure transport exists (fallback to Log if not set)
    if (!this.config.transport && !this.config.devMode) {
      this.config.transport = new LogTransport()
    }

    // In Dev Mode, override transport and setup Dev Server
    if (this.config.devMode) {
      this.devMailbox = new DevMailbox()
      this.config.transport = new MemoryTransport(this.devMailbox)
      core.logger.info('[OrbitSignal] Dev Mode Enabled: Emails will be intercepted to Dev Mailbox')

      const devServer = new DevServer(this.devMailbox, this.config.devUiPrefix || '/__mail')
      devServer.register(core)
    }

    // Inject mail service into context
    core.adapter.use('*', async (c, next) => {
      c.set('mail', {
        send: (mailable: Mailable) => this.send(mailable),
        queue: (mailable: Mailable) => this.queue(mailable),
      })
      await next()
      return undefined
    })
  }

  /**
   * Send a mailable instance
   *
   * @param mailable - The mailable object to send.
   * @returns A promise that resolves when the email is sent.
   * @throws {Error} If the message is missing "from" or "to" addresses, or if no transport is configured.
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
    if (!this.config.transport) {
      throw new Error(
        '[OrbitSignal] No transport configured. Did you call configure() or register the orbit?'
      )
    }
    await this.config.transport.send(message)
  }

  /**
   * Queue a mailable instance
   *
   * Push a mailable into the queue for execution.
   * Requires OrbitStream to be installed and available in the context.
   *
   * @param mailable - The mailable object to queue.
   * @returns A promise that resolves when the job is pushed to the queue or sent immediately if no queue service is found.
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
        '[OrbitSignal] Queue service not available, sending immediately. Install OrbitStream to enable queuing.'
      )
      await this.send(mailable)
    }
  }
}
