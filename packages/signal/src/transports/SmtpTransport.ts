import nodemailer from 'nodemailer'
import type { Address, Message } from '../types'
import { BaseTransport, type TransportOptions } from './BaseTransport'

/**
 * Configuration for SMTP email transport.
 *
 * Defines the connection parameters, authentication, and pooling settings for
 * communicating with an SMTP server.
 *
 * @example
 * ```typescript
 * const config: SmtpConfig = {
 *   host: 'smtp.mailtrap.io',
 *   port: 2525,
 *   auth: { user: 'username', pass: 'password' },
 *   poolSize: 10
 * };
 * ```
 *
 * @public
 */
export interface SmtpConfig extends TransportOptions {
  /** SMTP server hostname or IP address. */
  host: string
  /** SMTP server port (typically 25, 465, or 587). */
  port: number
  /** Whether to use a secure TLS/SSL connection. Should be true for port 465. */
  secure?: boolean
  /** Authentication credentials for the SMTP server. */
  auth?: {
    /** SMTP username. */
    user: string
    /** SMTP password. */
    pass: string
  }
  /** TLS specific options for the connection. */
  tls?: {
    /** Whether to reject unauthorized certificates (useful for self-signed certs). */
    rejectUnauthorized?: boolean
    /** Specific cipher suite to use for the connection. */
    ciphers?: string
  }
  /** Number of concurrent connections to maintain in the pool. */
  poolSize?: number
  /** Maximum time in milliseconds a connection can remain idle before being closed. */
  maxIdleTime?: number
}

/**
 * SMTP email transport with connection pooling and automatic retry.
 *
 * This transport uses the standard SMTP protocol to deliver emails. It leverages
 * `nodemailer` for robust protocol implementation and includes built-in support
 * for connection pooling to improve performance when sending multiple emails.
 * It inherits automatic retry logic from `BaseTransport`.
 *
 * @example
 * ```typescript
 * import { SmtpTransport } from '@gravito/signal';
 *
 * const transport = new SmtpTransport({
 *   host: 'smtp.example.com',
 *   port: 587,
 *   auth: { user: 'user', pass: 'pass' }
 * });
 *
 * await transport.send(message);
 * ```
 *
 * @public
 */
export class SmtpTransport extends BaseTransport {
  private transporter: nodemailer.Transporter

  /**
   * Initializes the SMTP transport with the provided configuration.
   *
   * Sets up the underlying nodemailer transporter with connection pooling enabled.
   *
   * @param config - SMTP connection and retry configuration.
   */
  constructor(config: SmtpConfig) {
    super({
      maxRetries: config.maxRetries,
      retryDelay: config.retryDelay,
      backoffMultiplier: config.backoffMultiplier,
    })

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      tls: config.tls,
      pool: true,
      maxConnections: config.poolSize ?? 5,
      maxMessages: Infinity,
      rateDelta: 1000,
      rateLimit: 10,
      socketTimeout: config.maxIdleTime ?? 30000,
      greetingTimeout: 30000,
    })
  }

  /**
   * Internal method to perform the actual SMTP delivery.
   *
   * Maps the generic `Message` object to the format expected by nodemailer.
   *
   * @param message - The message to deliver.
   * @returns A promise that resolves when the SMTP server accepts the message.
   * @throws {Error} If the SMTP server rejects the message or connection fails.
   */
  protected async doSend(message: Message): Promise<void> {
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

  /**
   * Gracefully shuts down the transport and closes all pooled connections.
   *
   * This should be called during application shutdown to ensure no resources are leaked.
   *
   * @returns A promise that resolves when all connections are closed.
   *
   * @example
   * ```typescript
   * await transport.close();
   * ```
   */
  async close(): Promise<void> {
    this.transporter.close()
  }

  /**
   * Verifies the SMTP connection and authentication.
   *
   * Useful for health checks or validating configuration during startup.
   *
   * @returns A promise that resolves to true if the connection is valid, false otherwise.
   *
   * @example
   * ```typescript
   * const isValid = await transport.verify();
   * if (!isValid) throw new Error('SMTP configuration is invalid');
   * ```
   */
  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify()
      return true
    } catch {
      return false
    }
  }

  /**
   * Formats an Address object into a standard RFC 822 string.
   *
   * @param addr - The address object to format.
   * @returns A string in the format "Name <email@example.com>" or just "email@example.com".
   */
  private formatAddress(addr: Address): string {
    return addr.name ? `"${addr.name}" <${addr.address}>` : addr.address
  }
}
