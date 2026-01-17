import type { GravitoContext } from '@gravito/core'
import type { Transport } from './transports/Transport'
export type { Transport }

/**
 * Representation of an email address with optional display name.
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
 * Used during the construction phase of a Mailable.
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
 * @public
 * @since 3.0.0
 */
export interface MailConfig {
  /**
   * Default sender address used if not specified in the Mailable.
   */
  from?: Address

  /**
   * The transport mechanism used to send emails (e.g., SMTP, SES, Log).
   */
  transport?: Transport

  /**
   * Enable development mode.
   * When true, emails are intercepted by the DevMailbox instead of being sent.
   */
  devMode?: boolean | undefined

  /**
   * Directory where email templates are located for use with OrbitPrism.
   * Default: src/emails
   */
  viewsDir?: string | undefined

  /**
   * URL prefix for the Mail Dev UI.
   * Default: /__mail
   */
  devUiPrefix?: string | undefined

  /**
   * Whether to allow access to the Mail Dev UI in production environments.
   * @default false
   */
  devUiAllowInProduction?: boolean | undefined

  /**
   * Authorization gate for the Mail Dev UI.
   * Should return true to allow access to the UI.
   */
  devUiGate?: ((ctx: GravitoContext) => boolean | Promise<boolean>) | undefined

  /**
   * Translation function for internationalization within emails.
   */
  translator?:
    | ((key: string, replace?: Record<string, unknown>, locale?: string) => string)
    | undefined
}
