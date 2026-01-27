import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses'
import nodemailer from 'nodemailer'
import type { Address, Message } from '../types'
import { BaseTransport, type TransportOptions } from './BaseTransport'

/**
 * Configuration for AWS SES email transport.
 *
 * Defines the AWS region and credentials required to communicate with the
 * Amazon Simple Email Service API.
 *
 * @example
 * ```typescript
 * const config: SesConfig = {
 *   region: 'us-east-1',
 *   accessKeyId: 'AKIA...',
 *   secretAccessKey: 'wJalr...',
 *   maxRetries: 5
 * };
 * ```
 *
 * @public
 */
export interface SesConfig extends TransportOptions {
  /** AWS region where the SES service is hosted (e.g., 'us-east-1'). */
  region: string
  /** AWS access key ID. If omitted, the SDK will attempt to use default credential providers. */
  accessKeyId?: string
  /** AWS secret access key. Required if accessKeyId is provided. */
  secretAccessKey?: string
}

/**
 * AWS SES (Simple Email Service) transport with automatic retry.
 *
 * This transport delivers emails via the Amazon SES API. It requires the
 * `@aws-sdk/client-ses` package to be installed as a dependency. It provides
 * a reliable way to send high volumes of email using AWS infrastructure and
 * includes automatic retry logic for transient API errors.
 *
 * @example
 * ```typescript
 * import { SesTransport } from '@gravito/signal';
 *
 * const transport = new SesTransport({
 *   region: 'us-west-2'
 * });
 *
 * await transport.send(message);
 * ```
 *
 * @public
 */
export class SesTransport extends BaseTransport {
  private transporter: nodemailer.Transporter

  /**
   * Initializes the SES transport with the provided configuration.
   *
   * Configures the AWS SES client and wraps it in a nodemailer transporter
   * for consistent message handling.
   *
   * @param config - AWS SES connection and retry configuration.
   */
  constructor(config: SesConfig) {
    super({
      maxRetries: config.maxRetries,
      retryDelay: config.retryDelay,
      backoffMultiplier: config.backoffMultiplier,
    })

    const clientConfig: any = { region: config.region }

    if (config.accessKeyId && config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      }
    }

    const ses = new SESClient(clientConfig)

    this.transporter = nodemailer.createTransport({
      SES: { ses, aws: { SendRawEmailCommand } },
    } as any)
  }

  /**
   * Internal method to perform the actual SES delivery.
   *
   * Converts the generic `Message` object into a raw email format and sends it
   * via the SES `SendRawEmail` API.
   *
   * @param message - The message to deliver.
   * @returns A promise that resolves when SES accepts the message for delivery.
   * @throws {Error} If the SES API returns an error or connection fails.
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
   * Formats an Address object into a standard RFC 822 string.
   *
   * @param addr - The address object to format.
   * @returns A string in the format "Name <email@example.com>" or just "email@example.com".
   */
  private formatAddress(addr: Address): string {
    return addr.name ? `"${addr.name}" <${addr.address}>` : addr.address
  }
}
