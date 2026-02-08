import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import { DevMailbox } from './dev/DevMailbox'
import { DevServer } from './dev/DevServer'
import type { MailEvent, MailEventHandler, MailEventType } from './events'
import type { Mailable } from './Mailable'
import { LogTransport } from './transports/LogTransport'
import { MemoryTransport } from './transports/MemoryTransport'
import type { MailConfig, Message } from './types'

/**
 * OrbitSignal - Mail service orbit for Gravito framework.
 *
 * @description
 * A production-ready email service providing multi-transport support, automatic retry,
 * event-driven lifecycle hooks, and development tooling. Integrates seamlessly with
 * Gravito's orbit system and queue infrastructure.
 *
 * @architecture
 * ```
 * OrbitSignal
 *   ├── Configuration (MailConfig)
 *   │   ├── transport: Transport (SMTP, SES, Log, Memory)
 *   │   ├── from: Default sender
 *   │   ├── devMode: Development interception
 *   │   └── translator: i18n support
 *   ├── Lifecycle Events
 *   │   ├── beforeRender → afterRender
 *   │   ├── beforeSend → afterSend
 *   │   └── sendFailed (on error)
 *   ├── Transport Layer
 *   │   ├── BaseTransport (retry, backoff)
 *   │   ├── SmtpTransport (connection pooling)
 *   │   ├── SesTransport (AWS SES)
 *   │   ├── LogTransport (console output)
 *   │   └── MemoryTransport (dev mode)
 *   └── Dev Tools
 *       ├── DevMailbox (in-memory storage)
 *       └── DevServer (preview UI at /__mail)
 * ```
 *
 * @example
 * **Basic SMTP Configuration**
 * ```typescript
 * import { OrbitSignal, SmtpTransport } from '@gravito/signal'
 *
 * const mail = new OrbitSignal({
 *   transport: new SmtpTransport({
 *     host: 'smtp.mailtrap.io',
 *     port: 2525,
 *     auth: { user: 'username', pass: 'password' }
 *   }),
 *   from: { name: 'My App', address: 'noreply@myapp.com' }
 * })
 *
 * mail.install(core)
 * ```
 *
 * @example
 * **AWS SES with Retry Configuration**
 * ```typescript
 * import { OrbitSignal, SesTransport } from '@gravito/signal'
 *
 * const mail = new OrbitSignal({
 *   transport: new SesTransport({
 *     region: 'us-east-1',
 *     retries: 3,
 *     retryDelay: 1000,
 *     retryMultiplier: 2
 *   }),
 *   from: { name: 'Production App', address: 'noreply@example.com' }
 * })
 * ```
 *
 * @example
 * **Development Mode with Preview UI**
 * ```typescript
 * const mail = new OrbitSignal({
 *   devMode: process.env.NODE_ENV === 'development',
 *   devUiPrefix: '/__mail',
 *   from: { name: 'Dev App', address: 'dev@localhost' }
 * })
 *
 * // All emails intercepted to memory, view at http://localhost:3000/__mail
 * ```
 *
 * @example
 * **Event-Driven Analytics & Error Handling**
 * ```typescript
 * const mail = new OrbitSignal({ ... })
 *
 * // Track successful sends
 * mail.on('afterSend', async (event) => {
 *   await analytics.track('email_sent', {
 *     to: event.message?.to,
 *     subject: event.message?.subject,
 *     timestamp: event.timestamp
 *   })
 * })
 *
 * // Log failures for monitoring
 * mail.on('sendFailed', async (event) => {
 *   logger.error('Email send failed', {
 *     error: event.error?.message,
 *     mailable: event.mailable.constructor.name
 *   })
 *   await sentry.captureException(event.error)
 * })
 * ```
 *
 * @example
 * **SMTP with Connection Pooling**
 * ```typescript
 * const mail = new OrbitSignal({
 *   transport: new SmtpTransport({
 *     host: 'smtp.gmail.com',
 *     port: 465,
 *     secure: true,
 *     auth: { user: 'user@gmail.com', pass: 'app-password' },
 *     poolSize: 5,
 *     maxIdleTime: 30000
 *   })
 * })
 *
 * // Graceful shutdown
 * process.on('SIGTERM', async () => {
 *   await mail.config.transport?.close?.()
 * })
 * ```
 *
 * @example
 * **Usage in Route Handlers**
 * ```typescript
 * // Injected automatically into GravitoContext
 * app.post('/register', async (c) => {
 *   const user = await createUser(c.req.json())
 *
 *   await c.get('mail').send(new WelcomeEmail(user))
 *
 *   return c.json({ success: true })
 * })
 * ```
 *
 * @example
 * **Queue Integration for Background Processing**
 * ```typescript
 * // Requires @gravito/stream
 * const email = new WelcomeEmail(user)
 *   .onQueue('emails')
 *   .delay(60)
 *
 * await email.queue()
 * ```
 *
 * @example
 * **Error Handling Best Practices**
 * ```typescript
 * try {
 *   await mail.send(new InvoiceEmail(order))
 * } catch (error) {
 *   if (error instanceof MailTransportError) {
 *     switch (error.code) {
 *       case MailErrorCode.RATE_LIMIT:
 *         await queue.pushDelayed(email, 300)
 *         break
 *       case MailErrorCode.RECIPIENT_REJECTED:
 *         await markUserEmailInvalid(user.id)
 *         break
 *       default:
 *         throw error
 *     }
 *   }
 * }
 * ```
 *
 * @see {@link Mailable} Base class for email definitions
 * @see {@link TypedMailable} Strongly-typed mailable with generic data
 * @see {@link Transport} Transport interface
 * @see {@link BaseTransport} Retry-enabled base transport
 * @see {@link MailConfig} Configuration interface
 * @see {@link MailEvent} Event types
 * @see {@link MailTransportError} Error handling
 *
 * @since 3.0.0
 * @public
 */
export class OrbitSignal implements GravitoOrbit {
  private config: MailConfig
  private devMailbox?: DevMailbox
  private core?: PlanetCore
  private eventHandlers = new Map<MailEventType, MailEventHandler[]>()

  constructor(config: MailConfig = {}) {
    this.config = config
  }

  /**
   * Install the orbit into PlanetCore.
   *
   * Registers the mail service in the IoC container and sets up development
   * tools if enabled. It also injects the service into the GravitoContext
   * for easy access in route handlers.
   *
   * @param core - The PlanetCore instance to install into
   *
   * @example
   * ```typescript
   * const mail = new OrbitSignal(config);
   * mail.install(core);
   * ```
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
    core.container.instance('mail', this)

    // 4. Inject mail service into context for easy access in routes
    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      c.set('mail', this)
      return await next()
    })

    // 5. Register Webhook Endpoint
    if (this.config.webhookPrefix) {
      // @ts-expect-error: Accessing internal adapter methods
      core.adapter.post(`${this.config.webhookPrefix}/:driver`, async (c: GravitoContext) => {
        const driverName = c.req.param('driver')
        const driver = this.config.webhookDrivers?.[driverName as string]

        if (!driver) {
          return c.json({ error: `Webhook driver "${driverName}" not found` }, 404)
        }

        try {
          const results = await driver.handle(c)
          if (results && Array.isArray(results)) {
            for (const result of results) {
              await this.handleWebhook(driverName as string, result.event, result.payload)
            }
          }
          return c.json({ success: true })
        } catch (error) {
          core.logger.error(`[OrbitSignal] Webhook error (${driverName}):`, error)
          return c.json({ error: 'Webhook processing failed' }, 500)
        }
      })
    }
  }

  /**
   * Internal: Handle processed webhook.
   */
  private async handleWebhook(driver: string, event: string, payload: any): Promise<void> {
    // We don't have a specific mailable for generic webhooks, so we create a dummy or pass null
    // But since MailEvent requires a mailable, we might need to adjust the interface or pass a Proxy
    // For now, let's assume it's acceptable to emit with a partial event if types allow,
    // or we might need to add a specialized emitWebhook method.

    await this.emit({
      type: 'webhookReceived',
      // biome-ignore lint/suspicious/noExplicitAny: Dummy mailable for webhook events
      mailable: {} as any,
      timestamp: new Date(),
      webhook: { driver, event, payload },
    })
  }

  /**
   * Send a mailable instance immediately.
   *
   * Orchestrates the full email sending lifecycle: building the envelope,
   * rendering content, emitting events, and delivering via the configured transport.
   *
   * @param mailable - The email definition to send
   * @throws {Error} If mandatory fields (from, to) are missing or transport fails
   *
   * @example
   * ```typescript
   * await mail.send(new WelcomeEmail(user));
   * ```
   */
  async send(mailable: Mailable): Promise<void> {
    try {
      // 1. Build envelope and get configuration
      const envelope = await mailable.buildEnvelope(this.config)

      // Validate required fields
      if (!envelope.from) {
        throw new Error('Message is missing "from" address')
      }
      if (!envelope.to || envelope.to.length === 0) {
        throw new Error('Message is missing "to" address')
      }

      // 2. Emit beforeRender event
      await this.emit({
        type: 'beforeRender',
        mailable,
        timestamp: new Date(),
      })

      // 3. Render content
      const content = await mailable.renderContent()

      // 4. Emit afterRender event
      await this.emit({
        type: 'afterRender',
        mailable,
        timestamp: new Date(),
      })

      // 5. Construct full message
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

      // 6. Emit beforeSend event
      await this.emit({
        type: 'beforeSend',
        mailable,
        message,
        timestamp: new Date(),
      })

      // 7. Send via transport
      if (!this.config.transport) {
        throw new Error('[OrbitSignal] No transport configured. Did you call register the orbit?')
      }
      await this.config.transport.send(message)

      // 8. Emit afterSend event
      await this.emit({
        type: 'afterSend',
        mailable,
        message,
        timestamp: new Date(),
      })
    } catch (error) {
      // Emit sendFailed event
      await this.emit({
        type: 'sendFailed',
        mailable,
        error: error as Error,
        timestamp: new Date(),
      })
      throw error
    }
  }

  /**
   * Queue a mailable instance for background processing.
   *
   * Attempts to use the 'queue' service (OrbitStream) if available in the
   * container. Falls back to immediate sending if no queue service is found.
   *
   * @param mailable - The email definition to queue
   *
   * @example
   * ```typescript
   * await mail.queue(new WelcomeEmail(user));
   * ```
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

  /**
   * Register an event handler.
   *
   * @description
   * Subscribe to mail lifecycle events for logging, analytics, or custom processing.
   *
   * @param event - The event type to listen for
   * @param handler - The handler function to execute
   * @returns This instance for method chaining
   *
   * @example
   * ```typescript
   * mail.on('afterSend', async (event) => {
   *   await analytics.track('email_sent', {
   *     to: event.message?.to,
   *     subject: event.message?.subject
   *   })
   * })
   * ```
   *
   * @public
   * @since 3.1.0
   */
  on(event: MailEventType, handler: MailEventHandler): this {
    const handlers = this.eventHandlers.get(event) || []
    handlers.push(handler)
    this.eventHandlers.set(event, handlers)
    return this
  }

  private async emit(event: MailEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.type) || []
    for (const handler of handlers) {
      await handler(event)
    }
  }
}

// Module augmentation for GravitoVariables
declare module '@gravito/core' {
  interface GravitoVariables {
    /** Mail service for sending emails */
    mail?: OrbitSignal
  }
}
