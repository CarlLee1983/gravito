import type { Transport } from './transports/Transport'
export type { Transport }

export interface Address {
  name?: string
  address: string
}

export interface Attachment {
  filename: string
  content: string | Buffer // Buffer for Node.js
  contentType?: string
  cid?: string // Content-ID for inline images
  encoding?: string
}

export interface Envelope {
  from?: Address | undefined
  to?: Address[] | undefined
  cc?: Address[] | undefined
  bcc?: Address[] | undefined
  replyTo?: Address | undefined
  subject?: string | undefined
  priority?: 'high' | 'normal' | 'low' | undefined
  attachments?: Attachment[] | undefined
}

export interface Message extends Envelope {
  from: Address // From is required in finalized message
  to: Address[] // To is required in finalized message
  subject: string
  html: string // The rendered HTML content
  text?: string // The rendered plain text content
  headers?: Record<string, string>
}

export interface MailConfig {
  /**
   * Default sender address
   */
  from?: Address

  /**
   * The transport mechanism used to send emails
   */
  transport?: Transport

  /**
   * Enable development mode (intercepts emails)
   */
  devMode?: boolean | undefined

  /**
   * Directory where email templates are located (for OrbitView)
   * Default: src/emails
   */
  viewsDir?: string | undefined

  /**
   * URL prefix for Dev UI
   * Default: /__mail
   */
  devUiPrefix?: string | undefined

  /**
   * Translation function for i18n support
   */
  translator?:
    | ((key: string, replace?: Record<string, unknown>, locale?: string) => string)
    | undefined
}
