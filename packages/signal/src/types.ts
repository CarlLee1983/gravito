import type { GravitoContext } from '@gravito/core'
import type { Transport } from './transports/Transport'

/**
 * Interface for Webhook Drivers.
 */
export interface WebhookDriver {
  handle(c: GravitoContext): Promise<{ event: string; payload: any }[] | null>
}

/**
 * Transport interface for sending email messages.
 *
 * Defines the contract for different delivery mechanisms (SMTP, SES, etc.).
 */
export type { Transport }

/**
 * Representation of an email address with optional display name.
 *
 * Defines the structure for email addresses used throughout the mail system.
 * Supports both simple string addresses and formatted addresses with display names.
 *
 * @example
 * ```typescript
 * // Simple address
 * const addr1: Address = { address: 'user@example.com' }
 *
 * // Address with display name
 * const addr2: Address = {
 *   name: 'John Doe',
 *   address: 'john@example.com'
 * }
 * ```
 *
 * @see {@link Envelope} For the email envelope structure
 * @see {@link Message} For the complete message structure
 *
 * @public
 * @since 3.0.0
 */
export interface Address {
  /** The display name of the recipient/sender, e.g., "John Doe". */
  name?: string
  /** The actual email address string. */
  address: string
}

/**
 * Configuration for an email attachment.
 *
 * Defines file attachments for email messages. Supports both regular attachments
 * and inline attachments (e.g., embedded images referenced via Content-ID).
 *
 * @example
 * ```typescript
 * // Regular file attachment
 * const attachment: Attachment = {
 *   filename: 'document.pdf',
 *   content: Buffer.from('...'),
 *   contentType: 'application/pdf'
 * }
 *
 * // Inline image attachment
 * const inlineImage: Attachment = {
 *   filename: 'logo.png',
 *   content: Buffer.from('...'),
 *   contentType: 'image/png',
 *   cid: 'logo@example.com' // Reference in HTML: <img src="cid:logo@example.com">
 * }
 * ```
 *
 * @see {@link Envelope} For adding attachments to emails
 *
 * @public
 * @since 3.0.0
 */
export interface Attachment {
  /** The filename of the attachment. */
  filename: string
  /** The content of the attachment as a string or Buffer. */
  content: string | Buffer // Buffer for Node.js
  /** Optional MIME type of the content. */
  contentType?: string
  /** Optional Content-ID for referencing within HTML content (inline images). */
  cid?: string // Content-ID for inline images
  /** Optional content encoding. */
  encoding?: string
}

/**
 * The envelope containing metadata for an email message.
 *
 * Used during the construction phase of a Mailable. All fields are optional
 * at this stage and will be validated when converting to a Message.
 *
 * @example
 * ```typescript
 * const envelope: Envelope = {
 *   from: { name: 'App', address: 'noreply@app.com' },
 *   to: [{ address: 'user@example.com' }],
 *   subject: 'Welcome!',
 *   priority: 'high',
 *   replyTo: { address: 'support@app.com' }
 * }
 * ```
 *
 * @see {@link Mailable} For building envelopes fluently
 * @see {@link Message} For the validated, finalized message structure
 *
 * @public
 * @since 3.0.0
 */
export interface Envelope {
  /** The sender's address. */
  from?: Address | undefined
  /** Primary recipients. */
  to?: Address[] | undefined
  /** Carbon copy recipients. */
  cc?: Address[] | undefined
  /** Blind carbon copy recipients. */
  bcc?: Address[] | undefined
  /** Reply-to address. */
  replyTo?: Address | undefined
  /** Email subject line. */
  subject?: string | undefined
  /** Importance level of the email. */
  priority?: 'high' | 'normal' | 'low' | undefined
  /** List of file attachments. */
  attachments?: Attachment[] | undefined
}

/**
 * A fully finalized email message ready to be sent by a transport.
 *
 * Requires mandatory fields that were optional in the Envelope.
 * This structure is passed to Transport implementations for actual delivery.
 *
 * @example
 * ```typescript
 * const message: Message = {
 *   from: { name: 'App', address: 'noreply@app.com' },
 *   to: [{ address: 'user@example.com' }],
 *   subject: 'Welcome to our service',
 *   html: '<h1>Welcome!</h1><p>Thanks for joining.</p>',
 *   text: 'Welcome! Thanks for joining.',
 *   priority: 'normal',
 *   headers: { 'X-Custom-Header': 'value' }
 * }
 * ```
 *
 * @see {@link Envelope} For the construction phase structure
 * @see {@link Transport} For implementations that send messages
 *
 * @public
 * @since 3.0.0
 */
export interface Message extends Envelope {
  /** The mandatory sender's address. */
  from: Address
  /** At least one recipient is required. */
  to: Address[]
  /** Mandatory subject. */
  subject: string
  /** The rendered HTML body content. */
  html: string
  /** Optional rendered plain text body content. */
  text?: string
  /** Custom SMTP headers. */
  headers?: Record<string, string>
}

/**
 * Global configuration options for OrbitSignal and Mailable instances.
 *
 * Configures the mail service behavior, transport mechanism, development tools,
 * and internationalization support.
 *
 * @example
 * ```typescript
 * import { OrbitSignal, SmtpTransport } from '@gravito/signal'
 *
 * const config: MailConfig = {
 *   from: { name: 'My App', address: 'noreply@myapp.com' },
 *   transport: new SmtpTransport({
 *     host: 'smtp.mailtrap.io',
 *     port: 2525,
 *     auth: { user: 'user', pass: 'pass' }
 *   }),
 *   devMode: process.env.NODE_ENV === 'development',
 *   viewsDir: './src/emails',
 *   devUiPrefix: '/__mail',
 *   translator: (key, replace, locale) => i18n.t(key, { ...replace, locale })
 * }
 *
 * const mail = new OrbitSignal(config)
 * ```
 *
 * @see {@link OrbitSignal} For the mail service implementation
 * @see {@link Transport} For available transport options
 *
 * @public
 * @since 3.0.0
 */
export interface MailConfig {
  /**
   * Default sender address used if not specified in the Mailable.
   *
   * @example
   * ```typescript
   * from: { name: 'My App', address: 'noreply@myapp.com' }
   * ```
   */
  from?: Address

  /**
   * The transport mechanism used to send emails (e.g., SMTP, SES, Log).
   *
   * @example
   * ```typescript
   * import { SmtpTransport } from '@gravito/signal'
   * transport: new SmtpTransport({ host: 'smtp.example.com', port: 587 })
   * ```
   */
  transport?: Transport

  /**
   * Enable development mode.
   * When true, emails are intercepted by the DevMailbox instead of being sent.
   *
   * @default false
   * @example
   * ```typescript
   * devMode: process.env.NODE_ENV === 'development'
   * ```
   */
  devMode?: boolean | undefined

  /**
   * Directory where email templates are located for use with OrbitPrism.
   *
   * @default "src/emails"
   * @example
   * ```typescript
   * viewsDir: './resources/views/emails'
   * ```
   */
  viewsDir?: string | undefined

  /**
   * URL prefix for the Mail Dev UI.
   *
   * @default "/__mail"
   * @example
   * ```typescript
   * devUiPrefix: '/dev/mailbox'
   * ```
   */
  devUiPrefix?: string | undefined

  /**
   * Whether to allow access to the Mail Dev UI in production environments.
   *
   * @default false
   * @example
   * ```typescript
   * devUiAllowInProduction: process.env.ALLOW_MAIL_UI === 'true'
   * ```
   */
  devUiAllowInProduction?: boolean | undefined

  /**
   * Authorization gate for the Mail Dev UI.
   * Should return true to allow access to the UI.
   *
   * @example
   * ```typescript
   * devUiGate: async (ctx) => {
   *   const user = await ctx.get('auth').user()
   *   return user?.role === 'admin'
   * }
   * ```
   */
  devUiGate?: ((ctx: GravitoContext) => boolean | Promise<boolean>) | undefined

  /**
   * Translation function for internationalization within emails.
   *
   * @example
   * ```typescript
   * translator: (key, replace, locale) => {
   *   return i18n.t(key, { ...replace, locale: locale || 'en' })
   * }
   * ```
   */
  translator?:
    | ((key: string, replace?: Record<string, unknown>, locale?: string) => string)
    | undefined

  /**
   * URL prefix for Webhook endpoints.
   */
  webhookPrefix?: string | undefined

  /**
   * Dictionary of registered webhook drivers.
   */
  webhookDrivers?: Record<string, WebhookDriver> | undefined
}
