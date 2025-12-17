import type { MailboxEntry } from '../DevMailbox';
import { layout } from './shared';

export function getPreviewHtml(entry: MailboxEntry, prefix: string): string {
  const from = entry.envelope.from
    ? `${entry.envelope.from.name || ''} &lt;${entry.envelope.from.address}&gt;`
    : 'Unknown';
  const to = entry.envelope.to?.map((t) => t.address).join(', ') || 'Unknown';

  const content = `
    <div class="header">
      <div class="title">
        <a href="${prefix}" class="btn">← Back</a>
        <span style="margin-left: 10px">Email Preview</span>
      </div>
      <button onclick="deleteEmail('${entry.id}')" class="btn btn-danger">Delete</button>
    </div>

    <div class="card" style="margin-bottom: 20px; padding: 20px;">
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">${entry.envelope.subject || '(No Subject)'}</div>
      <div class="meta" style="margin-bottom: 5px;">From: ${from}</div>
      <div class="meta" style="margin-bottom: 5px;">To: ${to}</div>
      <div class="meta">Date: ${entry.sentAt.toLocaleString()}</div>
    </div>

    <div style="margin-bottom: 10px;">
      <button onclick="setView('html')" id="btn-html" class="btn btn-primary">HTML</button>
      <button onclick="setView('text')" id="btn-text" class="btn">Text</button>
      <button onclick="setView('raw')" id="btn-raw" class="btn">Raw JSON</button>
      <a href="${prefix}/${entry.id}/html" target="_blank" class="btn">Open HTML ↗</a>
    </div>

    <div class="card" style="height: 600px; display: flex;">
      <iframe id="preview-frame" src="${prefix}/${entry.id}/html" style="width: 100%; height: 100%; border: none;"></iframe>
      <pre id="raw-view" style="display: none; padding: 20px; overflow: auto; width: 100%;">${JSON.stringify(entry, null, 2)}</pre>
      <pre id="text-view" style="display: none; padding: 20px; overflow: auto; width: 100%; white-space: pre-wrap; font-family: monospace;">${entry.text || 'No text content'}</pre>
    </div>

    <script>
      function setView(mode) {
        document.getElementById('preview-frame').style.display = mode === 'html' ? 'block' : 'none';
        document.getElementById('raw-view').style.display = mode === 'raw' ? 'block' : 'none';
        document.getElementById('text-view').style.display = mode === 'text' ? 'block' : 'none';
        
        document.getElementById('btn-html').className = mode === 'html' ? 'btn btn-primary' : 'btn';
        document.getElementById('btn-text').className = mode === 'text' ? 'btn btn-primary' : 'btn';
        document.getElementById('btn-raw').className = mode === 'raw' ? 'btn btn-primary' : 'btn';
      }

      async function deleteEmail(id) {
        if (!confirm('Delete this email?')) return;
        await fetch('${prefix}/' + id, { method: 'DELETE' });
        window.location.href = '${prefix}';
      }
    </script>
  `;

  return layout(entry.envelope.subject || 'Preview', content);
}
