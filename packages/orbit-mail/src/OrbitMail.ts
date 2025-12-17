import type { GravitoOrbit, PlanetCore } from 'gravito-core';
import { DevMailbox } from './dev/DevMailbox';
import { DevServer } from './dev/DevServer';
import type { Mailable } from './Mailable';
import { LogTransport } from './transports/LogTransport';
import { MemoryTransport } from './transports/MemoryTransport';
import type { MailConfig, Message } from './types';

export class OrbitMail implements GravitoOrbit {
  private config: MailConfig;
  private devMailbox?: DevMailbox;

  private constructor(config: MailConfig) {
    this.config = config;
  }

  /**
   * Configure the OrbitMail instance
   */
  static configure(config: MailConfig): OrbitMail {
    // Basic validation
    if (!config.transport && !config.devMode) {
      console.warn('[OrbitMail] No transport provided, falling back to LogTransport');
      config.transport = new LogTransport();
    }
    return new OrbitMail(config);
  }

  /**
   * Install the orbit into PlanetCore
   */
  install(core: PlanetCore): void {
    core.logger.info('[OrbitMail] Initializing Mail Service (Exposed as: mail)');

    // In Dev Mode, override transport and setup Dev Server
    if (this.config.devMode) {
      this.devMailbox = new DevMailbox();
      // Only override if not explicitly set to something else, or maybe ALWAYS override in devMode?
      // Usually devMode implies intercepting all mails.
      // But let's log a warning if we are overriding a real transport

      this.config.transport = new MemoryTransport(this.devMailbox);
      core.logger.info('[OrbitMail] Dev Mode Enabled: Emails will be intercepted to Dev Mailbox');

      const devServer = new DevServer(this.devMailbox, this.config.devUiPrefix || '/__mail');
      devServer.register(core);
    }

    // Inject mail service into context
    core.app.use('*', async (c, next) => {
      // @ts-expect-error: Extending Hono Context dynamically
      c.set('mail', {
        send: (mailable: Mailable) => this.send(mailable),
      });
      await next();
    });
  }

  /**
   * Send a mailable instance
   */
  async send(mailable: Mailable): Promise<void> {
    // 1. Build envelope and get configuration
    const envelope = await mailable.buildEnvelope(this.config);

    // Validate required fields
    if (!envelope.from) throw new Error('Message is missing "from" address');
    if (!envelope.to || envelope.to.length === 0)
      throw new Error('Message is missing "to" address');

    // 2. Render content
    const content = await mailable.renderContent();

    // 3. Construct full message
    const message: Message = {
      ...envelope,
      from: envelope.from!,
      to: envelope.to!,
      subject: envelope.subject || '(No Subject)',
      priority: envelope.priority || 'normal',
      html: content.html,
    };

    if (content.text) {
      message.text = content.text;
    }

    // 4. Send via transport
    await this.config.transport.send(message);
  }
}
