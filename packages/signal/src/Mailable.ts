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
 * Provides a fluent API for building email envelopes and rendering content
 * using various engines (raw HTML, Prism templates, React, or Vue).
 *
 * @example
 * ```typescript
 * class WelcomeMail extends Mailable {
 *   build() {
 *     return this.subject('Welcome!')
 *                .view('emails.welcome', { name: 'John' });
 *   }
 * }
 *
 * await new WelcomeMail().to('john@example.com').send();
 * ```
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
   * @param address - Email address or Address object.
   */
  from(address: string | Address): this {
    this.envelope.from = typeof address === 'string' ? { address } : address
    return this
  }

  /**
   * Set the primary recipient(s) for the email.
   *
   * @param address - Single address, address object, or array of either.
   */
  to(address: string | Address | (string | Address)[]): this {
    this.envelope.to = this.normalizeAddressArray(address)
    return this
  }

  /**
   * Set the carbon copy (CC) recipient(s).
   *
   * @param address - Single address, address object, or array of either.
   */
  cc(address: string | Address | (string | Address)[]): this {
    this.envelope.cc = this.normalizeAddressArray(address)
    return this
  }

  /**
   * Set the blind carbon copy (BCC) recipient(s).
   *
   * @param address - Single address, address object, or array of either.
   */
  bcc(address: string | Address | (string | Address)[]): this {
    this.envelope.bcc = this.normalizeAddressArray(address)
    return this
  }

  /**
   * Set the reply-to address.
   *
   * @param address - Email address or Address object.
   */
  replyTo(address: string | Address): this {
    this.envelope.replyTo = typeof address === 'string' ? { address } : address
    return this
  }

  /**
   * Set the subject line for the email.
   *
   * @param subject - The email subject.
   */
  subject(subject: string): this {
    this.envelope.subject = subject
    return this
  }

  /**
   * Set the email priority.
   *
   * @param level - Priority level ('high', 'normal', or 'low').
   */
  emailPriority(level: 'high' | 'normal' | 'low'): this {
    this.envelope.priority = level
    return this
  }

  /**
   * Attach a file to the email.
   *
   * @param attachment - Attachment configuration object.
   */
  attach(attachment: Attachment): this {
    this.envelope.attachments = this.envelope.attachments || []
    this.envelope.attachments.push(attachment)
    return this
  }

  // ===== Content Methods (Renderer Selection) =====

  /**
   * Set the content using raw HTML string.
   *
   * @param content - The HTML content string.
   */
  html(content: string): this {
    this.renderer = new HtmlRenderer(content)
    return this
  }

  /**
   * Set the content using an OrbitPrism template.
   *
   * @param template - Template name (relative to viewsDir/emails).
   * @param data - Optional data to pass to the template.
   */
  view(template: string, data?: Record<string, unknown>): this {
    this.renderer = new TemplateRenderer(template, undefined) // Dir will be injected later if possible, or use default
    this.renderData = data || {}
    return this
  }

  /**
   * Set the content using a React component.
   * Dynamically imports ReactRenderer to avoid hard dependency errors if React is not installed.
   *
   * @param component - The React component to render.
   * @param props - Optional props for the component.
   * @param deps - Optional dependencies (React, ReactDOMServer) if not globally available.
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
   * Dynamically imports VueRenderer to avoid hard dependency errors if Vue is not installed.
   *
   * @param component - The Vue component to render.
   * @param props - Optional props for the component.
   * @param deps - Optional dependencies (Vue, VueServerRenderer) if not globally available.
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
   * Setup the mailable. This is where you call from(), to(), view(), etc.
   * This method must be implemented by concrete classes.
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
   * Set the queue name for this mailable.
   */
  onQueue(queue: string): this {
    this.queueName = queue
    return this
  }

  /**
   * Set the connection name for this mailable.
   */
  onConnection(connection: string): this {
    this.connectionName = connection
    return this
  }

  /**
   * Set a delay for the queued mailable.
   */
  delay(seconds: number): this {
    this.delaySeconds = seconds
    return this
  }

  /**
   * Set the priority for the queued mailable.
   */
  withPriority(priority: string | number): this {
    this.priority = priority
    return this
  }

  /**
   * Queue the mailable for sending.
   * Attempts to resolve the mail service from the PlanetCore container.
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
   * Set the locale for the message.
   *
   * @param locale - Valid locale string (e.g., 'en', 'zh-TW').
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
   * Translate a string using the configured translator.
   *
   * @param key - Translation key.
   * @param replace - Interpolation variables.
   * @returns Translated string or the key if translator is missing.
   */
  t(key: string, replace?: Record<string, unknown>): string {
    if (this.translator) {
      return this.translator(key, replace, this.currentLocale)
    }
    return key // Fallback: just return the key if no translator
  }

  // ===== Internal Systems =====

  /**
   * Compile the envelope based on config defaults and mailable settings.
   * Called by OrbitSignal before rendering/sending.
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
   * Execute the renderer and produce HTML/Text content.
   * @returns Object containing rendered html and optional text content.
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
