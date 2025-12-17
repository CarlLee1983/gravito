export const styles = `
:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --bg-dark: #0f172a;
  --bg-card: #1e293b;
  --text: #f1f5f9;
  --text-muted: #94a3b8;
  --border: #334155;
  --danger: #ef4444;
}
body { background: var(--bg-dark); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; }
.container { max-width: 1000px; margin: 0 auto; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.title { font-size: 24px; font-weight: bold; display: flex; align-items: center; gap: 10px; }
.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.btn { background: var(--border); color: var(--text); border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; text-decoration: none; font-size: 14px; transition: 0.2s; }
.btn:hover { background: var(--bg-card-hover); }
.btn-primary { background: var(--primary); color: white; }
.btn-primary:hover { background: var(--primary-dark); }
.btn-danger { background: var(--danger); color: white; }
.list-item { padding: 16px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; text-decoration: none; color: inherit; transition: background 0.2s; }
.list-item:last-child { border-bottom: none; }
.list-item:hover { background: #334155; }
.meta { display: flex; justify-content: space-between; font-size: 14px; color: var(--text-muted); }
.subject { font-weight: 600; font-size: 16px; }
.from { color: #cbd5e1; }
.badge { background: #475569; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
.badge-high { background: #dc2626; color: white; }
.empty { padding: 40px; text-align: center; color: var(--text-muted); }
`;

export const layout = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
  <title>${title} - Gravito Mailbox</title>
  <style>${styles}</style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
`;
