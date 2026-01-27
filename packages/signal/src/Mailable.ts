import type { Queueable } from '@gravito/stream' // Import Queueable from orbit-queue
import { HtmlRenderer } from './renderers/HtmlRenderer'
import type { Renderer } from './renderers/Renderer'
import { TemplateRenderer } from './renderers/TemplateRenderer'
import type { Address, Attachment, Envelope, MailConfig } from './types'

// Type placeholders for React/Vue components to avoid hard dependencies in core
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComponentType = any

/**
 * Base class for all mailable messages.
 *
 * @description
 * Mailable provides a fluent API to build email envelopes and render content
 * using multiple engines: HTML, Prism templates, React, and Vue components.
 *
 * @architecture
 * ```
 * Mailable
 *   ├── Envelope (from, to, subject, cc, bcc, attachments)
 *   ├── Renderer (HtmlRenderer | TemplateRenderer | ReactRenderer | VueRenderer)
 *   └── Queueable (queue support interface)
 * ```
 *
 * @lifecycle
 * 1. Create Mailable subclass
 * 2. Implement build() method to configure envelope and content
 * 3. Call send() to send immediately, or queue() for background processing
 * 4. OrbitSignal calls buildEnvelope() → renderContent() → transport.send()
 *
 * @example
 * ```typescript
 * import { Mailable } from '@gravito/signal'
 *
 * class WelcomeEmail extends Mailable {
 *   constructor(private user: User) {
 *     super()
 *   }
 *
 *   build() {
 *     return this
 *       .to(this.user.email)
 *       .subject('Welcome!')
 *       .view('emails/welcome', { name: this.user.name })
 *   }
 * }
 *
 * // Send immediately
 * await mail.send(new WelcomeEmail(user))
 *
 * // Queue for background processing
 * await new WelcomeEmail(user).onQueue('emails').queue()
 * ```
 *
 * @see {@link OrbitSignal} Mail service orchestrator
 * @see {@link Renderer} Content rendering interface
 * @see {@link Envelope} Email metadata structure
 * @see {@link Queueable} Queue integration interface
 *
 * @public
 * @since 3.0.0
 */
export abstract class Mailable implements Queueable {
  protected envelope: Partial<Envelope> = {}
  protected renderer?: Renderer
  private rendererResolver?: () => Promise<Renderer>
  protected renderData: Record<string, unknown> = {}
  protected config?: MailConfig

  // ===== Fluent API (Envelope Construction) =====

  /**
   * Set the sender address for the email.
   *
   * This defines the "From" field in the email envelope. If not called, the default
   * sender from the mail configuration will be used.
   *
   * @param address - The email address or address object containing name and address.
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.from('admin@example.com')
   * mailable.from({ name: 'Support', address: 'support@example.com' })
   * ```
   */
  from(address: string | Address): this {
    this.envelope.from = typeof address === 'string' ? { address } : address
    return this
  }

  /**
   * Set the primary recipient(s) for the email.
   *
   * Configures the "To" field. Supports single or multiple recipients in various formats.
   *
   * @param address - A single email string, an address object, or an array of either.
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.to('user@example.com')
   * mailable.to(['a@example.com', 'b@example.com'])
   * mailable.to({ name: 'John', address: 'john@example.com' })
   * ```
   */
  to(address: string | Address | (string | Address)[]): this {
    this.envelope.to = this.normalizeAddressArray(address)
    return this
  }

  /**
   * Set the carbon copy (CC) recipient(s).
   *
   * Adds recipients to the "Cc" field of the email.
   *
   * @param address - A single email string, an address object, or an array of either.
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.cc('manager@example.com')
   * ```
   */
  cc(address: string | Address | (string | Address)[]): this {
    this.envelope.cc = this.normalizeAddressArray(address)
    return this
  }

  /**
   * Set the blind carbon copy (BCC) recipient(s).
   *
   * Adds recipients to the "Bcc" field. These recipients are hidden from others.
   *
   * @param address - A single email string, an address object, or an array of either.
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.bcc('audit@example.com')
   * ```
   */
  bcc(address: string | Address | (string | Address)[]): this {
    this.envelope.bcc = this.normalizeAddressArray(address)
    return this
  }

  /**
   * Set the reply-to address.
   *
   * Specifies where replies to this email should be directed.
   *
   * @param address - The email address or address object for replies.
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.replyTo('no-reply@example.com')
   * ```
   */
  replyTo(address: string | Address): this {
    this.envelope.replyTo = typeof address === 'string' ? { address } : address
    return this
  }

  /**
   * Set the subject line for the email.
   *
   * Defines the text that appears in the recipient's inbox subject field.
   *
   * @param subject - The subject text.
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.subject('Your Order Confirmation')
   * ```
   */
  subject(subject: string): this {
    this.envelope.subject = subject
    return this
  }

  /**
   * Set the email priority.
   *
   * Hints to the email client how urgent this message is.
   *
   * @param level - The priority level: 'high', 'normal', or 'low'.
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.emailPriority('high')
   * ```
   */
  emailPriority(level: 'high' | 'normal' | 'low'): this {
    this.envelope.priority = level
    return this
  }

  /**
   * Attach a file to the email.
   *
   * Adds a file attachment to the message. Can be called multiple times for multiple files.
   *
   * @param attachment - The attachment configuration including path, content, or filename.
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.attach({
   *   filename: 'invoice.pdf',
   *   path: './storage/invoices/123.pdf'
   * })
   * ```
   */
  attach(attachment: Attachment): this {
    this.envelope.attachments = this.envelope.attachments || []
    this.envelope.attachments.push(attachment)
    return this
  }

  // ===== Content Methods (Renderer Selection) =====

  /**
   * Set the content using a raw HTML string.
   *
   * Use this for simple emails where a full template engine is not required.
   *
   * @param content - The raw HTML content.
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.html('<h1>Hello</h1><p>Welcome to our platform.</p>')
   * ```
   */
  html(content: string): this {
    this.renderer = new HtmlRenderer(content)
    return this
  }

  /**
   * Set the content using an OrbitPrism template.
   *
   * Renders a template file with the provided data. This is the recommended way
   * to build complex, data-driven emails.
   *
   * @param template - The template name or path relative to the configured views directory.
   * @param data - The data object to be injected into the template.
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.view('emails.welcome', { name: 'Alice' })
   * ```
   */
  view(template: string, data?: Record<string, unknown>): this {
    this.renderer = new TemplateRenderer(template, undefined) // Dir will be injected later if possible, or use default
    this.renderData = data || {}
    return this
  }

  /**
   * Set the content using a React component.
   *
   * Leverages React's component model for email design. The renderer is loaded
   * dynamically to keep the core package lightweight.
   *
   * @param component - The React component class or function.
   * @param props - The properties to pass to the component.
   * @param deps - Optional React/ReactDOMServer overrides for custom environments.
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.react(WelcomeEmailComponent, { name: 'Alice' })
   * ```
   */
  react<P extends object>(
    component: ComponentType,
    props?: P,
    deps?: {
      createElement?: (...args: any[]) => any
      renderToStaticMarkup?: (element: any) => string
    }
  ): this {
    this.rendererResolver = async () => {
      const { ReactRenderer } = await import('./renderers/ReactRenderer')
      return new ReactRenderer(component, props, deps)
    }
    return this
  }

  /**
   * Set the content using a Vue component.
   *
   * Leverages Vue's component model for email design. The renderer is loaded
   * dynamically to keep the core package lightweight.
   *
   * @param component - The Vue component object.
   * @param props - The properties to pass to the component.
   * @param deps - Optional Vue/VueServerRenderer overrides for custom environments.
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.vue(WelcomeEmailComponent, { name: 'Alice' })
   * ```
   */
  vue<P extends object>(
    component: ComponentType,
    props?: P,
    deps?: {
      createSSRApp?: (...args: any[]) => any
      h?: (...args: any[]) => any
      renderToString?: (app: any) => Promise<string>
    }
  ): this {
    this.rendererResolver = async () => {
      const { VueRenderer } = await import('./renderers/VueRenderer')
      return new VueRenderer(component, props as any, deps)
    }
    return this
  }

  // ===== Life Cycle =====

  /**
   * Configure the mailable's envelope and content.
   *
   * This abstract method must be implemented by subclasses to define the email's
   * recipients, subject, and body using the fluent API.
   *
   * @returns The current mailable instance.
   *
   * @example
   * ```typescript
   * build() {
   *   return this.to('user@example.com').subject('Hi').html('...')
   * }
   * ```
   */
  abstract build(): this

  // ===== Queueable Implementation =====

  /** The name of the queue to push this mailable to. */
  queueName?: string
  /** The connection name for the queue. */
  connectionName?: string
  /** Delay in seconds before the message is sent. */
  delaySeconds?: number
  /** Priority of the message in the queue. */
  priority?: number | string

  /**
   * Set the target queue for background processing.
   *
   * @param queue - The name of the queue.
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.onQueue('notifications')
   * ```
   */
  onQueue(queue: string): this {
    this.queueName = queue
    return this
  }

  /**
   * Set the queue connection to be used.
   *
   * @param connection - The name of the connection (e.g., 'redis', 'sqs').
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.onConnection('redis')
   * ```
   */
  onConnection(connection: string): this {
    this.connectionName = connection
    return this
  }

  /**
   * Set a delay for the queued message.
   *
   * The message will remain in the queue and only be processed after the delay.
   *
   * @param seconds - The delay in seconds.
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.delay(3600) // Delay for 1 hour
   * ```
   */
  delay(seconds: number): this {
    this.delaySeconds = seconds
    return this
  }

  /**
   * Set the priority for the queued message.
   *
   * Higher priority messages are typically processed before lower priority ones.
   *
   * @param priority - The priority value (numeric or string).
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.withPriority(10)
   * ```
   */
  withPriority(priority: string | number): this {
    this.priority = priority
    return this
  }

  /**
   * Push the mailable onto the configured queue.
   *
   * Automatically resolves the mail service from the Gravito container and
   * dispatches this mailable for background processing.
   *
   * @returns A promise that resolves when the mailable is queued.
   *
   * @example
   * ```typescript
   * await new WelcomeEmail(user).queue()
   * ```
   */
  async queue(): Promise<void> {
    // We should ideally use the container to get the mail service
    // But since Mailable might be used outside a core context, we'll try a safe approach.
    try {
      // biome-ignore lint/suspicious/noTsIgnore: Global access to app() helper from core
      // @ts-ignore
      const { app } = await import('@gravito/core')
      const mail = app().container.make<any>('mail')
      if (mail) {
        return mail.queue(this)
      }
    } catch (_e) {
      // Fallback if core is not available
      console.warn('[Mailable] Could not auto-resolve mail service for queuing.')
    }
  }

  // ===== I18n Support =====

  protected currentLocale?: string
  protected translator?: (key: string, replace?: Record<string, unknown>, locale?: string) => string

  /**
   * Set the locale for the email content.
   *
   * Used by the translator to resolve localized strings in templates or components.
   *
   * @param locale - The locale identifier (e.g., 'en-US', 'fr').
   * @returns The current mailable instance for chaining.
   *
   * @example
   * ```typescript
   * mailable.locale('es')
   * ```
   */
  locale(locale: string): this {
    this.currentLocale = locale
    return this
  }

  /**
   * Internal: Set the translator function (called by OrbitSignal)
   * @internal
   */
  setTranslator(
    translator: (key: string, replace?: Record<string, unknown>, locale?: string) => string
  ): void {
    this.translator = translator
  }

  /**
   * Translate a key into a localized string.
   *
   * Uses the configured translator and current locale to resolve the key.
   *
   * @param key - The translation key.
   * @param replace - Key-value pairs for string interpolation.
   * @returns The translated string, or the key itself if no translator is available.
   *
   * @example
   * ```typescript
   * const text = mailable.t('messages.welcome', { name: 'Alice' })
   * ```
   */
  t(key: string, replace?: Record<string, unknown>): string {
    if (this.translator) {
      return this.translator(key, replace, this.currentLocale)
    }
    return key // Fallback: just return the key if no translator
  }

  // ===== Internal Systems =====

  /**
   * Compile the final email envelope.
   *
   * Merges mailable-specific settings with global configuration defaults.
   * This is called internally by the mail service before sending.
   *
   * @param configPromise - The mail configuration or a promise resolving to it.
   * @returns The fully constructed envelope.
   *
   * @example
   * ```typescript
   * const envelope = await mailable.buildEnvelope(config)
   * ```
   */
  async buildEnvelope(configPromise: MailConfig | Promise<MailConfig>): Promise<Envelope> {
    const config = await Promise.resolve(configPromise)
    this.config = config

    // Inject translator from config if available
    if (config.translator) {
      this.setTranslator(config.translator)
    }

    this.build() // User logic executes here

    // Ensure Renderer is initialized if using TemplateRenderer with config path
    if (this.renderer instanceof TemplateRenderer && config.viewsDir) {
      // Re-initialize or update TemplateRenderer with the correct directory
      this.renderer = new TemplateRenderer((this.renderer as any).template, config.viewsDir)
    }

    const envelope: Envelope = {
      from: this.envelope.from || config.from,
      to: this.envelope.to || [],
      subject: this.envelope.subject || '(No Subject)',
      priority: this.envelope.priority || 'normal',
    }

    if (this.envelope.cc) {
      envelope.cc = this.envelope.cc
    }
    if (this.envelope.bcc) {
      envelope.bcc = this.envelope.bcc
    }
    if (this.envelope.replyTo) {
      envelope.replyTo = this.envelope.replyTo
    }
    if (this.envelope.attachments) {
      envelope.attachments = this.envelope.attachments
    }

    return envelope
  }

  /**
   * Render the email content to HTML and plain text.
   *
   * Executes the chosen renderer (HTML, Template, React, or Vue) with the
   * provided data and i18n helpers.
   *
   * @returns The rendered HTML and optional plain text content.
   * @throws {Error} If no renderer has been specified.
   *
   * @example
   * ```typescript
   * const { html } = await mailable.renderContent()
   * ```
   */
  async renderContent(): Promise<{ html: string; text?: string }> {
    // Resolve lazy renderer if needed
    if (!this.renderer && this.rendererResolver) {
      this.renderer = await this.rendererResolver()
    }

    if (!this.renderer) {
      throw new Error('No content renderer specified. Use html(), view(), react(), or vue().')
    }

    // Inject i18n helpers into renderData
    this.renderData = {
      ...this.renderData,
      locale: this.currentLocale,
      t: (key: string, replace?: Record<string, unknown>) => this.t(key, replace),
    }

    return this.renderer.render(this.renderData)
  }

  private normalizeAddressArray(input: string | Address | (string | Address)[]): Address[] {
    const arr = Array.isArray(input) ? input : [input]
    return arr.map((item) => (typeof item === 'string' ? { address: item } : item))
  }
}
