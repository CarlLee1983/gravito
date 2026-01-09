import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import { DevMailbox } from './dev/DevMailbox'
import { DevServer } from './dev/DevServer'
import type { Mailable } from './Mailable'
import { LogTransport } from './transports/LogTransport'
import { MemoryTransport } from './transports/MemoryTransport'
import type { MailConfig, Message } from './types'

export class OrbitSignal implements GravitoOrbit {
  private config: MailConfig
  private devMailbox?: DevMailbox
  private core?: PlanetCore

  constructor(config: MailConfig = {}) {
    this.config = config
  }

  /**
   * Install the orbit into PlanetCore
   *
   * @param core - The PlanetCore instance.
   */
  install(core: PlanetCore): void {
    this.core = core
    core.logger.info('[OrbitSignal] Initializing Mail Service')

    // 1. Ensure transport exists (fallback to Log if not set)
    if (!this.config.transport && !this.config.devMode) {
      this.config.transport = new LogTransport()
    }

    // 2. In Dev Mode, override transport and setup Dev Server
    if (this.config.devMode) {
      this.devMailbox = new DevMailbox()
      this.config.transport = new MemoryTransport(this.devMailbox)
      core.logger.info('[OrbitSignal] Dev Mode Enabled: Emails will be intercepted to Dev Mailbox')

      const devServer = new DevServer(this.devMailbox, this.config.devUiPrefix || '/__mail', {
        allowInProduction: this.config.devUiAllowInProduction,
        gate: this.config.devUiGate,
      })
      devServer.register(core)
    }

    // 3. Register in container
    core.container.singleton('mail', () => this)

    // 4. Inject mail service into context for easy access in routes
    core.adapter.use('*', async (c, next) => {
      c.set('mail', this)
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
      throw new Error('[OrbitSignal] No transport configured. Did you call register the orbit?')
    }
    await this.config.transport.send(message)
  }

  /**
   * Queue a mailable instance
   */
  async queue(mailable: Mailable): Promise<void> {
    try {
      // 嘗試從容器獲取隊列服務 (OrbitStream)
      const queue = this.core?.container.make<any>('queue')
      if (queue) {
        await queue.push(mailable)
        return
      }
    } catch (_e) {
      // 找不到隊列服務時，會拋出錯誤，我們捕捉並降級
    }

    // Fallback: 直接發送
    await this.send(mailable)
  }
}
