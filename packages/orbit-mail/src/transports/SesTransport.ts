import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';
import type { Address, Message, Transport } from '../types';

export interface SesConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export class SesTransport implements Transport {
  private transporter: nodemailer.Transporter;

  constructor(config: SesConfig) {
    const clientConfig: any = { region: config.region };

    if (config.accessKeyId && config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    }

    const ses = new SESClient(clientConfig);

    this.transporter = nodemailer.createTransport({
      SES: { ses, aws: { SendRawEmailCommand } },
    } as any);
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
    });
  }

  private formatAddress(addr: Address): string {
    return addr.name ? `"${addr.name}" <${addr.address}>` : addr.address;
  }
}
