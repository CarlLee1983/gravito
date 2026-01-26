import nodemailer from 'nodemailer'
import type { Address, Message, Transport } from '../types'

/**
 * Configuration for SMTP email transport.
 *
 * @public
 * @since 3.0.0
 */
export interface SmtpConfig {
  /** SMTP server hostname */
  host: string
  /** SMTP server port (typically 25, 465, or 587) */
  port: number
  /** Use TLS/SSL connection (true for port 465) */
  secure?: boolean
  /** Authentication credentials */
  auth?: {
    /** SMTP username */
    user: string
    /** SMTP password */
    pass: string
  }
  /** TLS options */
  tls?: {
    /** Reject unauthorized certificates */
    rejectUnauthorized?: boolean
    /** Cipher suite */
    ciphers?: string
  }
}

/**
 * SMTP email transport.
 *
 * Sends emails using standard SMTP protocol with support for
 * authentication, TLS/SSL, attachments, and all email features.
 *
 * @example
 * ```typescript
 * const transport = new SmtpTransport({
 *   host: 'smtp.gmail.com',
 *   port: 587,
 *   secure: false,
 *   auth: {
 *     user: 'user@gmail.com',
 *     pass: 'app-password'
 *   }
 * })
 * await transport.send(message)
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class SmtpTransport implements Transport {
  private transporter: nodemailer.Transporter

  constructor(config: SmtpConfig) {
    this.transporter = nodemailer.createTransport(config)
  }

  async send(message: Message): Promise<void> {
    await this.transporter.sendMail({
      from: this.formatAddress(message.from),
      to: message.to.map(this.formatAddress),
      cc: message.cc?.map(this.formatAddress),
      bcc: message.bcc?.map(this.formatAddress),
      replyTo: message.replyTo ? this.formatAddress(message.replyTo) : undefined,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: message.headers,
      priority: message.priority,
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
        cid: a.cid,
        encoding: a.encoding,
      })),
    })
  }

  private formatAddress(addr: Address): string {
    return addr.name ? `"${addr.name}" <${addr.address}>` : addr.address
  }
}
