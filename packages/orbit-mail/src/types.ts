import type { Transport } from './transports/Transport';

export interface Address {
  name?: string;
  address: string;
}

export interface Attachment {
  filename: string;
  content: string | Buffer; // Buffer for Node.js
  contentType?: string;
  cid?: string; // Content-ID for inline images
  encoding?: string;
}

export interface Envelope {
  from?: Address;
  to?: Address[];
  cc?: Address[];
  bcc?: Address[];
  replyTo?: Address;
  subject?: string;
  priority?: 'high' | 'normal' | 'low';
  attachments?: Attachment[];
}

export interface Message extends Envelope {
  from: Address; // From is required in finalized message
  to: Address[]; // To is required in finalized message
  subject: string;
  html: string; // The rendered HTML content
  text?: string; // The rendered plain text content
  headers?: Record<string, string>;
}

export interface MailConfig {
  /**
   * Default sender address
   */
  from: Address;

  /**
   * The transport mechanism used to send emails
   */
  transport: Transport;

  /**
   * Enable development mode (intercepts emails)
   */
  devMode?: boolean;

  /**
   * Directory where email templates are located (for OrbitView)
   * Default: src/emails
   */
  viewsDir?: string;

  /**
   * URL prefix for Dev UI
   * Default: /__mail
   */
  devUiPrefix?: string;
}
