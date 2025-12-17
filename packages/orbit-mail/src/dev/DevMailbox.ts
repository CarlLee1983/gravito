import { randomUUID } from 'crypto';
import type { Envelope, Message } from '../types';

export interface MailboxEntry {
  id: string;
  envelope: Envelope;
  html: string;
  text?: string;
  sentAt: Date;
}

export class DevMailbox {
  private entries: MailboxEntry[] = [];
  private maxEntries = 50;

  add(message: Message): MailboxEntry {
    const entry: MailboxEntry = {
      id: randomUUID(),
      envelope: {
        from: message.from,
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        replyTo: message.replyTo,
        subject: message.subject,
        priority: message.priority,
        attachments: message.attachments,
      },
      html: message.html,
      text: message.text,
      sentAt: new Date(),
    };

    this.entries.unshift(entry);

    // Limit size
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }

    return entry;
  }

  list(): MailboxEntry[] {
    return this.entries;
  }

  get(id: string): MailboxEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  delete(id: string): boolean {
    const index = this.entries.findIndex((e) => e.id === id);
    if (index !== -1) {
      this.entries.splice(index, 1);
      return true;
    }
    return false;
  }

  clear(): void {
    this.entries = [];
  }
}
