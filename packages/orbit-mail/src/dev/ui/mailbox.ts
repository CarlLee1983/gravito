// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Address } from '../../types';
import type { MailboxEntry } from '../DevMailbox';
import { layout } from './shared';

function formatAddress(addr: { name?: string; address: string }): string {
  return addr.name ? `${addr.name} <${addr.address}>` : addr.address;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

export function getMailboxHtml(entries: MailboxEntry[], prefix: string): string {
  const list =
    entries.length === 0
      ? '<div class="empty">No emails found in mailbox.</div>'
      : entries
          .map(
            (entry) => `
      <a href="${prefix}/${entry.id}" class="list-item">
        <div class="meta">
          <span class="from">${formatAddress(entry.envelope.from || { address: 'Unknown' })}</span>
          <span>${timeAgo(entry.sentAt)}</span>
        </div>
        <div class="subject">
          ${entry.envelope.priority === 'high' ? '<span class="badge badge-high">High</span> ' : ''}
          ${entry.envelope.subject || '(No Subject)'}
        </div>
        <div class="meta" style="margin-top: 4px;">
           To: ${entry.envelope.to?.map((t) => t.address).join(', ')}
        </div>
      </a>
    `
          )
          .join('');

  const content = `
    <div class="header">
      <div class="title">📬 Gravito Mailbox</div>
      ${entries.length > 0 ? `<button onclick="clearAll()" class="btn btn-danger">Clear All</button>` : ''}
    </div>
    
    <div class="card">
      ${list}
    </div>

    <script>
      async function clearAll() {
        if (!confirm('Clear all emails?')) return;
        await fetch('${prefix}', { method: 'DELETE' });
        window.location.reload();
      }
    </script>
  `;

  return layout('Inbox', content);
}
