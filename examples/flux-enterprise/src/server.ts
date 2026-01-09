import { randomUUID } from 'node:crypto'
import { existsSync, watch } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { RippleServer } from '@gravito/ripple'
import { env } from './env'
import { traceLocation } from './flux'
import { ProcessWorkflowJob } from './jobs/ProcessWorkflowJob'
import { getQueueManager } from './stream'

// Initialize Ripple
const ripple = new RippleServer({ path: '/ws' })
await ripple.init()

// File Watcher for Trace Logic
let traceWatcherSetup = false
function setupTraceWatcher() {
  if (traceWatcherSetup) return

  // Poll until file exists, then watch
  const checkInterval = setInterval(() => {
    if (existsSync(traceLocation)) {
      clearInterval(checkInterval)
      traceWatcherSetup = true
      console.log(`👀 Watching trace file at: ${traceLocation}`)

      watch(traceLocation, async (eventType) => {
        console.log(`📁 File event: ${eventType}`)
        // Handle both change and rename (some editors/writers do atomic replace)
        if (eventType === 'change' || eventType === 'rename') {
          // Broadcast latest events
          try {
            // Small delay to ensure write flush
            await new Promise((r) => setTimeout(r, 50))
            const events = await readTraceEvents(50)
            console.log(`📡 Broadcasting ${events.length} trace events`)
            ripple.broadcast('trace-updates', 'update', { events })
          } catch (err) {
            console.error('Error reading/broadcasting trace:', err)
          }
        }
      })
    }
  }, 1000)
}

setupTraceWatcher()

const listener = Bun.serve({
  port: env.port,
  websocket: ripple.getHandler(),
  async fetch(request, server) {
    // 1. Handle WebSocket Upgrade
    const success = ripple.upgrade(request, server)
    if (success) {
      console.log('connection upgraded')
      return undefined
    }

    const url = new URL(request.url)

    // 2. Serve Ripple Client
    if (url.pathname === '/ripple-client.js') {
      return new Response(Bun.file('../../packages/ripple-client/dist/index.mjs'), {
        headers: { 'Content-Type': 'application/javascript' },
      })
    }

    if (request.method === 'POST' && url.pathname === '/orders') {
      try {
        const payload = await request.json()
        const workflowName = payload.workflowName || 'flux-enterprise-order'

        // Prepare input based on workflow type or generic fallback
        const input = { ...payload }
        delete input.workflowName

        // Ensure we have some ID for tracking
        if (!input.orderId && !input.id) {
          input.orderId = `req-${randomUUID()}`
        }

        const queue = await getQueueManager()

        const job = new ProcessWorkflowJob({
          workflowName,
          input,
        }).onQueue(env.rabbitQueue)

        await queue.push(job)

        return new Response(
          JSON.stringify({
            status: 'queued',
            orderId: input.orderId || input.id,
            workflow: workflowName,
          }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    if (request.method === 'POST' && url.pathname === '/retry') {
      try {
        const payload = await request.json()
        const { id } = payload
        const newId = `retry-${id.slice(0, 8)}`
        const workflowName = 'flux-enterprise-order'

        const input = {
          orderId: newId,
          userId: 'cmd-user',
          items: [{ productId: 'widget-a', qty: 1 }],
          isRetry: true,
          originalId: id,
        }

        const queue = await getQueueManager()
        const job = new ProcessWorkflowJob({ workflowName, input }).onQueue(env.rabbitQueue)
        await queue.push(job)

        return new Response(JSON.stringify({ status: 'queued', id: newId }), {
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    if (request.method === 'GET' && url.pathname === '/trace') {
      if (!existsSync(traceLocation)) {
        return new Response('Trace file not found', { status: 404 })
      }
      const trace = await readFile(traceLocation, 'utf-8')
      return new Response(trace, {
        status: 200,
        headers: { 'Content-Type': 'application/x-ndjson' },
      })
    }

    if (request.method === 'GET' && url.pathname === '/trace-events') {
      const events = await readTraceEvents()
      return new Response(JSON.stringify({ events }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (request.method === 'GET' && url.pathname === '/metrics') {
      try {
        const queue = await getQueueManager()
        // Get queue depth for the configured queue
        const depth = await queue.size(env.rabbitQueue)

        // Simple metric: Count total lines in trace specific to completed/failed
        // For performance, we'll just check if file exists, if not 0.
        // A real app would use a DB count or cached metric.
        // For now, we return the Queue Depth which is the critical requested metric.
        return new Response(JSON.stringify({ backlog: depth }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (e) {
        // If queue is down or other error
        return new Response(JSON.stringify({ backlog: -1, error: String(e) }), {
          status: 200, // Return 200 so UI handles it gracefully
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    if (request.method === 'GET' && url.pathname === '/') {
      return dashboardResponse()
    }

    return new Response('Not Found', { status: 404 })
  },
})

function dashboardResponse() {
  return new Response(dashboardHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

async function readTraceEvents(max = 100) {
  if (!existsSync(traceLocation)) {
    return []
  }

  const trace = await readFile(traceLocation, 'utf-8')
  const lines = trace
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-max)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter((event): event is Record<string, unknown> => Boolean(event))

  return lines
}

const dashboardHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Flux Mission Control</title>
  <style>
    :root {
      --bg: #0b0d14;
      --panel: #11141d;
      --border: #2d3342;
      --text: #c9d1d9;
      --accent: #58a6ff;
      --success: #3fb950;
      --warn: #d29922;
      --error: #f85149;
      --purple: #bc8cff;
    }
    body {
      margin: 0; padding: 0; font-family: 'Segoe UI', monospace;
      background: var(--bg); color: var(--text); height: 100vh;
      overflow: hidden; display: grid; grid-template-columns: 350px 1fr;
    }

    /* Common UI Elements */
    .stats-panel {
      display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-top: 20px;
    }
    .pool.backlog .pool-count { color: var(--purple); }
    .pool {
      background: rgba(255,255,255,0.05); border: 1px solid #333; border-radius: 4px;
      padding: 10px; text-align: center;
    }
    .pool-label { font-size: 0.55rem; color: #888; font-weight: bold; margin-bottom: 4px; }
    .pool-count { font-size: 1.2rem; font-weight: bold; color: #fff; }
    .pool.success .pool-count { color: var(--success); }
    .pool.recovered .pool-count { color: var(--warn); }
    .pool.failed .pool-count { color: var(--error); }

    #attention-list {
      flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;
      padding-right: 4px;
    }
    .attention-item {
      background: rgba(255,255,255,0.03); border: 1px solid #333; border-radius: 4px;
      padding: 8px; font-size: 0.75rem; display: flex; justify-content: space-between; align-items: center;
    }
    .attention-item.recovered { border-left: 3px solid var(--warn); }
    .attention-item.failed { border-left: 3px solid var(--error); background: rgba(248, 81, 73, 0.05); }
    
    .item-info { display: flex; flex-direction: column; gap: 2px; }
    .item-id { font-family: monospace; color: #fff; font-weight: bold; }
    .item-detail { color: #8b949e; font-size: 0.65rem; }
    
    .retry-btn {
      background: var(--accent); color: #0b0d14; border: none; border-radius: 3px;
      padding: 4px 8px; font-size: 0.65rem; font-weight: bold; cursor: pointer;
      text-transform: uppercase;
    }
    .retry-btn:hover { background: #fff; }

    /* Sidebar */
    .mission-control {
      background: var(--panel); border-right: 1px solid var(--border);
      display: flex; flex-direction: column; padding: 1.5rem; gap: 1rem;
      height: 100vh; overflow: hidden; box-sizing: border-box;
      z-index: 10;
    }
    h1 { margin: 0; font-size: 1.1rem; letter-spacing: 1px; text-transform: uppercase; color: #fff; border-bottom: 2px solid var(--accent); padding-bottom: 10px; display: inline-block; }
    
    .control-group { display: flex; flex-direction: column; gap: 10px; }
    
    select.mission-selector {
      background: #0b0d14; border: 1px solid var(--border); color: #fff;
      padding: 8px; border-radius: 4px; font-family: inherit; font-size: 0.8rem;
      outline: none;
    }
    
    button#launch-btn {
      background: rgba(88, 166, 255, 0.1); color: var(--accent);
      border: 1px solid var(--accent); padding: 0.8rem;
      font-weight: bold; font-size: 0.9rem; border-radius: 4px;
      cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 1px;
    }
    button#launch-btn:hover:not(:disabled) { background: var(--accent); color: #000; box-shadow: 0 0 15px var(--accent); }
    button#launch-btn:disabled { opacity: 0.5; cursor: not-allowed; border-color: #444; color: #888; }

    #log-feed {
      flex: 1; min-height: 0; background: #0b0d14;
      border: 1px solid var(--border); border-radius: 4px; padding: 0.5rem;
      overflow-y: auto; font-family: 'SF Mono', monospace; font-size: 0.7rem;
      display: flex; flex-direction: column; gap: 6px;
    }
    .log-entry { padding-left: 8px; border-left: 2px solid #333; color: #888; }
    .log-entry.retry { border-color: var(--warn); color: var(--warn); }
    .log-entry.error { border-color: var(--error); color: var(--error); }
    .log-entry.success { border-color: var(--success); color: var(--success); }

    /* View Container */
    .view-container {
      position: relative; width: 100%; height: 100%;
      overflow: hidden;
    }
    .view-section {
      width: 100%; height: 100%; display: none;
      position: absolute; top: 0; left: 0;
    }
    .view-section.active { display: flex; }

    /* Space View (Order Rocket) */
    .space-view {
      background: linear-gradient(to bottom, #050608 0%, #13161c 100%);
      flex-direction: column; justify-content: flex-end;
      overflow-x: auto; overflow-y: hidden;
    }
    .space-view::before {
      content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 40px 40px; pointer-events: none;
    }

    #launch-pad {
      display: flex; gap: 40px; padding: 0 60px 60px 60px;
      align-items: flex-end; min-width: max-content;
    }

    /* Network Graph View (Generic / Saga / Supply) */
    .network-view {
      background: #050505;
      display: flex; align-items: center; justify-content: center;
      position: relative;
    }
    .network-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px; padding: 40px; width: 100%; max-width: 1200px;
      overflow-y: auto;
    }
    
    .node-card {
      background: rgba(20, 24, 32, 0.8); border: 1px solid #333;
      border-radius: 8px; padding: 15px; position: relative;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex; flex-direction: column; gap: 5px;
    }
    .node-card.active { border-color: var(--accent); box-shadow: 0 0 20px rgba(88, 166, 255, 0.1); transform: scale(1.02); }
    .node-card.completed { border-color: var(--success); }
    .node-card.failed { border-color: var(--error); box-shadow: 0 0 10px rgba(248, 81, 73, 0.2); }
    .node-card.compensated { border-color: var(--purple); opacity: 0.7; }
    
    .node-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
    .node-id { font-size: 0.8rem; font-weight: bold; color: #fff; font-family: monospace; }
    .node-status { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; background: #222; color: #888; text-transform: uppercase; }
    .node-card.active .node-status { background: rgba(88, 166, 255, 0.2); color: var(--accent); }
    .node-card.completed .node-status { background: rgba(63, 185, 80, 0.2); color: var(--success); }
    .node-card.failed .node-status { background: rgba(248, 81, 73, 0.2); color: var(--error); }
    .node-card.compensated .node-status { background: rgba(188, 140, 255, 0.2); color: var(--purple); }

    .node-steps { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; }
    .step-dot {
      display: flex; align-items: center; gap: 8px; font-size: 0.7rem; color: #666;
    }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: #333; transition: all 0.3s; }
    .step-dot.active .dot { background: var(--accent); box-shadow: 0 0 5px var(--accent); }
    .step-dot.completed .dot { background: var(--success); }
    .step-dot.failed .dot { background: var(--error); }
    .step-dot.compensated .dot { background: var(--purple); }
    
    .step-dot.active { color: #fff; }

    /* Animations and SVGs from before */
    .mission-container {
      position: relative; width: 60px; height: 300px;
      flex-shrink: 0; display: flex; flex-direction: column-reverse; justify-content: flex-start;
      transition: opacity 1s, transform 1s;
    }
    .mission-container.recycled { opacity: 0; transform: scale(0.5); pointer-events: none; }
    .rocket-svg {
      width: 60px; height: 240px; position: absolute; bottom: 0; left: 0;
      transition: transform 1s cubic-bezier(0.25, 1, 0.5, 1);
      will-change: transform; filter: drop-shadow(0 0 5px rgba(0,0,0,0.5));
    }
    .part { fill: #161b22; stroke: #30363d; stroke-width: 1.5px; transition: fill 0.3s, stroke 0.3s, opacity 0.5s; }
    .part.active { fill: #1f6feb; stroke: #58a6ff; }
    .part.retry { fill: #9e6a03; stroke: #d29922; animation: shake 0.5s infinite; }
    .part.failed { fill: #7a1e1e; stroke: #ff7b72; }
    .part.completed { fill: transparent; stroke: #238636; opacity: 0.3; stroke-dasharray: 4; }
    .part[data-id="notify"].completed { fill: #238636; stroke: #3fb950; opacity: 1; stroke-dasharray: 0; filter: drop-shadow(0 0 8px rgba(63, 185, 80, 0.6)); }
    
    .rocket-svg.launching-1 { transform: translateY(-60px); }
    .rocket-svg.launching-2 { transform: translateY(-120px); }
    .rocket-svg.launching-3 { transform: translateY(-180px); }
    .rocket-svg.launching-4 { transform: translateY(-380px); }
    
    .total-time {
      position: absolute; top: -20px; width: 100%; text-align: center;
      color: #fff; font-size: 0.65rem; text-shadow: 0 0 5px var(--success);
      opacity: 0; transition: opacity 0.5s;
    }
    .rocket-svg.launching-4 .total-time { opacity: 1; }

    @keyframes shake { 
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-1px); }
      75% { transform: translateX(1px); }
    }

    /* Modal */
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(5px);
      z-index: 100; display: none; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.3s ease;
    }
    .modal-overlay.open { display: flex; opacity: 1; }
    
    .modal {
      background: var(--panel); border: 1px solid var(--border); border-radius: 8px;
      width: 500px; max-width: 90%; box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      align-items: center;
      transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .modal-overlay.open .modal { transform: scale(1); }
    
    .modal-header {
      padding: 15px 20px; border-bottom: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center;
      background: rgba(255,255,255,0.02);
    }
    .modal-title { font-size: 1rem; color: #fff; font-weight: bold; }
    .modal-close { background: none; border: none; color: #666; font-size: 1.5rem; cursor: pointer; }
    .modal-close:hover { color: #fff; }
    
    .modal-body { padding: 20px; color: var(--text); font-size: 0.9rem; line-height: 1.5; }
    .modal-field { margin-bottom: 15px; }
    .modal-label { font-size: 0.7rem; color: #888; text-transform: uppercase; margin-bottom: 5px; display: block; }
    .modal-value { background: #000; padding: 10px; border-radius: 4px; font-family: monospace; border: 1px solid #333; }
    .modal-value.error { color: var(--error); border-color: rgba(248, 81, 73, 0.3); background: rgba(248, 81, 73, 0.05); }

    .modal-footer {
      padding: 15px 20px; border-top: 1px solid var(--border);
      display: flex; justify-content: flex-end; gap: 10px;
    }
    .btn { padding: 8px 16px; border-radius: 4px; font-size: 0.85rem; cursor: pointer; border: none; font-weight: bold; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.8; }
    .btn-secondary { background: #333; color: #fff; }
    .btn-primary { background: var(--accent); color: #000; }
  </style>
</head>
<body>

  <div class="mission-control">
    <div>
      <h1>Flux Mission Control</h1>
      <div style="font-size: 0.7rem; color: #666; margin-top: 5px;">SYS: ONLINE</div>
    </div>

    <div class="control-group">
      <div style="font-size: 0.7rem; color: #888; text-transform: uppercase; font-weight: bold;">Mission Profile</div>
      <select id="mission-type" class="mission-selector">
        <option value="flux-enterprise-order">📦 Order Enrollment (Rocket)</option>
        <option value="saga-travel-reservation">✈️ Travel Saga (Compensation)</option>
        <option value="global-supply-chain">🚢 Supply Chain (Parallel)</option>
      </select>
    </div>

    <div class="control-group">
      <button id="launch-btn">🚀 INITIALIZE EVENT</button>
      <label style="font-size: 0.75rem; color: #8b949e; display: flex; align-items: center; cursor: pointer; margin-top: 4px;">
        <input type="checkbox" id="force-fail" style="margin-right: 8px;"> 
        SIMULATE ANOMALY / FAIL
      </label>
    </div>
    
    <div class="stats-panel">
      <div class="pool backlog" style="border-color: var(--purple);"><div class="pool-label" style="color: var(--purple);">QUEUE BACKLOG</div><div class="pool-count" id="count-backlog">-</div></div>
      <div class="pool success"><div class="pool-label">SUCCESS</div><div class="pool-count" id="count-perfect">0</div></div>
      <div class="pool recovered"><div class="pool-label">RECOVERED</div><div class="pool-count" id="count-recovered">0</div></div>
      <div class="pool failed"><div class="pool-label">FAILED</div><div class="pool-count" id="count-failed">0</div></div>
    </div>

    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; margin-top: 1rem;">
      <h2 style="font-size: 0.75rem; color: #d29922; text-transform: uppercase; margin-bottom: 0.5rem;">Attention Required</h2>
      <div id="attention-list"></div>
    </div>

    <div style="height: 25%; display: flex; flex-direction: column; border-top: 1px solid var(--border); padding-top: 1rem;">
      <h2 style="font-size: 0.75rem; color: #58a6ff; text-transform: uppercase; margin-bottom: 0.5rem;">System Logs</h2>
      <div id="log-feed"></div>
    </div>
  </div>

  <div class="view-container">
    <div id="view-rocket" class="view-section active space-view">
      <div id="launch-pad"></div>
    </div>
    
    <div id="view-network" class="view-section network-view">
      <div class="network-grid" id="network-grid">
        <!-- Node cards injected here -->
      </div>
    </div>
  </div>

  <!-- Review Modal -->
  <div class="modal-overlay" id="review-modal">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">Order Anomaly Review</div>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
         <div class="modal-field">
            <label class="modal-label">Transaction ID</label>
            <div class="modal-value" id="modal-id"></div>
         </div>
         <div class="modal-field">
            <label class="modal-label">Failure Reason</label>
            <div class="modal-value error" id="modal-reason"></div>
         </div>
         <div class="modal-field">
            <label class="modal-label">Recommended Action</label>
            <div style="font-size: 0.85rem; color: #888;">
               The system has halted processing for this order. Review the error trace above. 
               You can choose to retry the step or discard the transaction.
            </div>
         </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Dismiss</button>
        <button class="btn btn-primary" onclick="retryTransaction()">Retry Transaction</button>
      </div>
    </div>
  </div>

  <script type="module">
    import { createRippleClient } from '/ripple-client.js';

    // Configuration
    const WORKFLOW_ORDER = 'flux-enterprise-order';
    const WORKFLOW_SAGA = 'saga-travel-reservation';
    const WORKFLOW_SUPPLY = 'global-supply-chain';

    // Rocket Steps Mapping
    const rocketSteps = ['validate-order', 'reserve-stock', 'charge-payment', 'notify-customer'];
    const rocketStepMap = {
      'validate-order': 'booster',
      'reserve-stock': 'fuel',
      'charge-payment': 'upper',
      'notify-customer': 'notify'
    };

    // State
    const activeMissions = new Map(); // For rockets
    const networkNodes = new Map(); // For network view
    const stateCache = {};
    const loggedMissions = new Set(); // Prevent double counting
    const pageLoadTime = Date.now();
    let currentView = 'rocket';

    // DOM Elements
    const logFeed = document.getElementById('log-feed');
    const launchPad = document.getElementById('launch-pad');
    const networkGrid = document.getElementById('network-grid');
    const missionSelector = document.getElementById('mission-type');

    missionSelector.addEventListener('change', (e) => {
      const type = e.target.value;
      if (type === WORKFLOW_ORDER) {
        switchView('rocket');
      } else {
        switchView('network');
      }
    });

    function switchView(viewName) {
      if (currentView === viewName) return;
      currentView = viewName;
      document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
      document.getElementById('view-' + viewName).classList.add('active');
    }

    // --- Rocket Logic (Legacy) ---
    function createRocketSVG(id) {
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("class", "rocket-svg");
      svg.setAttribute("viewBox", "0 0 60 240");
      
      const gNotify = document.createElementNS(svgNS, "g"); gNotify.setAttribute("id", "p-" + id + "-notify"); gNotify.setAttribute("class", "part");
      const pNotify = document.createElementNS(svgNS, "path"); pNotify.setAttribute("d", "M15,60 L15,40 C15,20 30,10 30,10 C30,10 45,20 45,40 L45,60 Z"); gNotify.appendChild(pNotify);
      gNotify.dataset.id = "notify";
      
      const timeText = document.createElement("div"); timeText.className = "total-time";
      
      const gUpper = document.createElementNS(svgNS, "g"); gUpper.setAttribute("id", "p-" + id + "-upper"); gUpper.setAttribute("class", "part");
      const pUpper = document.createElementNS(svgNS, "rect"); pUpper.setAttribute("x", "15"); pUpper.setAttribute("y", "62"); pUpper.setAttribute("width", "30"); pUpper.setAttribute("height", "58"); gUpper.appendChild(pUpper);

      const gFuel = document.createElementNS(svgNS, "g"); gFuel.setAttribute("id", "p-" + id + "-fuel"); gFuel.setAttribute("class", "part");
      const pFuel = document.createElementNS(svgNS, "rect"); pFuel.setAttribute("x", "15"); pFuel.setAttribute("y", "122"); pFuel.setAttribute("width", "30"); pFuel.setAttribute("height", "58"); gFuel.appendChild(pFuel);

      const gBooster = document.createElementNS(svgNS, "g"); gBooster.setAttribute("id", "p-" + id + "-booster"); gBooster.setAttribute("class", "part");
      const pBooster = document.createElementNS(svgNS, "path"); pBooster.setAttribute("d", "M15,182 L15,230 L5,240 L15,240 L15,240 L20,235 L40,235 L45,240 L55,240 L45,230 L45,182 Z"); gBooster.appendChild(pBooster);

      svg.appendChild(gBooster); svg.appendChild(gFuel); svg.appendChild(gUpper); svg.appendChild(gNotify);
      return { svg, timeText };
    }

    function createRocketDOM(id) {
      const container = document.createElement('div');
      container.className = 'mission-container';
      container.id = 'mission-' + id;

      const { svg, timeText } = createRocketSVG(id);
      
      const labelId = document.createElement('div');
      labelId.className = 'stage-label mission-id';
      labelId.textContent = id.slice(0, 8);
      labelId.style.opacity = "1";
      labelId.style.bottom = "-25px";

      container.appendChild(svg);
      container.appendChild(timeText);
      container.appendChild(labelId);
      launchPad.appendChild(container);

      return { container, svg, isCleaningUp: false, hadRetries: false };
    }

    function updateRocket(id, state) {
      let elements = activeMissions.get(id);
      if (!elements) {
        // If it's already done when we first see it (e.g. page reload)
        if (state.status === 'completed' || state.status === 'failed') {
             // Ensure it's logged in stats/attention list, then ignore
             logCompletion(id, state, false); 
             return; 
        }
        elements = createRocketDOM(id);
        activeMissions.set(id, elements);
      }

      const { svg, container } = elements;
      let completedCount = 0;

      rocketSteps.forEach((stepName, idx) => {
        const svgGroupId = 'p-' + id + '-' + rocketStepMap[stepName];
        const part = svg.getElementById(svgGroupId);
        if(!part) return;

        const stepState = state.steps[stepName];
        if (!stepState) return;

        part.setAttribute("class", "part");
        if (stepState.status === 'completed') {
          part.classList.add('completed');
          completedCount = Math.max(completedCount, idx + 1);
        } else if (stepState.status === 'running') {
           part.classList.add('active');
           if (stepState.retries > 0) {
             elements.hadRetries = true;
             part.classList.add('retry');
           } 
        } else if (stepState.status === 'failed') {
          part.classList.add('failed');
        }
      });

      svg.className.baseVal = 'rocket-svg launching-' + completedCount;

      if ((state.status === 'completed' || state.status === 'failed') && !elements.isCleaningUp) {
        elements.isCleaningUp = true;
        if(state.duration) {
           const timeEl = container.querySelector('.total-time');
           timeEl.textContent = (state.duration) + 'ms';
        }
        
        // Log & Cleanup
        logCompletion(id, state, elements.hadRetries);
        setTimeout(() => {
          container.classList.add('recycled');
          setTimeout(() => {
             container.remove();
             activeMissions.delete(id);
          }, 1000);
        }, 8000);
      }
    }

    // --- Network View Logic (Generic) ---
    function createNetworkNode(id, workflowId) {
       const card = document.createElement('div');
       card.className = 'node-card';
       card.id = 'node-' + id;
       
       let emoji = '🔮';
       if(workflowId.includes('order')) emoji = '🚀';
       if(workflowId.includes('saga')) emoji = '✈️';
       if(workflowId.includes('supply')) emoji = '🚢';
       
       card.innerHTML = \`
         <div class="node-header">
            <span class="node-id">\${emoji} \${id.slice(0,8)}</span>
            <span class="node-status">PENDING</span>
         </div>
         <div class="node-steps" id="steps-\${id}"></div>
       \`;
       networkGrid.prepend(card);
       // Keep grid size manageable (16 items = 4x4 grid)
       if(networkGrid.children.length > 16) {
           const removed = networkGrid.lastChild;
           if(removed && removed.id) {
               const removedId = removed.id.replace('node-', '');
               networkNodes.delete(removedId);
           }
           removed.remove();
       }
       
       return { card, stepsContainer: card.querySelector('.node-steps') };
    }

    function updateNetworkNode(id, state, workflowId) {
      let node = networkNodes.get(id);
      if (!node) {
        node = createNetworkNode(id, workflowId);
        networkNodes.set(id, node);
      }

      const { card, stepsContainer } = node;
      const statusEl = card.querySelector('.node-status');
      
      statusEl.textContent = state.status;
      card.className = 'node-card ' + state.status;
      
      // Check for compensation/rollback to style accordingly
      // Saga specific detection
      const isCompensating = Object.keys(state.steps).some(k => k.includes('compensation') && state.steps[k].status === 'running');
      if (isCompensating) {
         card.classList.add('compensated');
         statusEl.textContent = 'ROLLBACK';
      }

      Object.keys(state.steps).forEach(stepName => {
        let stepEl = document.getElementById('step-' + id + '-' + stepName);
        if (!stepEl) {
           stepEl = document.createElement('div');
           stepEl.id = 'step-' + id + '-' + stepName;
           stepEl.className = 'step-dot';
           // Format step name nicely
           const label = stepName.replace(/-/g, ' ').toUpperCase();
           stepEl.innerHTML = \`<div class="dot"></div> \${label}\`;
           stepsContainer.appendChild(stepEl);
        }

        const sState = state.steps[stepName];
        stepEl.className = 'step-dot ' + sState.status;
        if(stepName.includes('compensation') && sState.status !== 'pending') {
           stepEl.classList.add('compensated');
        }
      });

      if ((state.status === 'completed' || state.status === 'failed') && !node.finished) {
         node.finished = true;
         // Handle removal or archiving logic if needed
         logCompletion(id, state, false); // No "hadRetries" tracking for network graph yet
      }
    }

// --- Shared Logic ---
function logCompletion(id, state, hadRetries) {
  if (loggedMissions.has(id)) return;
  loggedMissions.add(id);

  let type = 'failed';
  if (state.status === 'completed') {
    type = hadRetries ? 'recovered' : 'success';
  }

  const el = document.getElementById(type === 'success' ? 'count-perfect' : (type === 'recovered' ? 'count-recovered' : 'count-failed'));
  if (el) el.textContent = parseInt(el.textContent) + 1;

  if (type !== 'success') {
    const list = document.getElementById('attention-list');
    const item = document.createElement('div');
    item.className = 'attention-item ' + type;
    item.id = 'attn-' + id;

    let reason = type === 'recovered' ? 'Retried' : 'Failure';
    // Improve reason finding
    const steps = Object.entries(state.steps);
    const failStep = steps.find(([_, s]) => s.status === 'failed');
    if (failStep) {
        reason = 'Failed: ' + failStep[0];
        if (failStep[1].error) {
            // Add the specific error message details
            reason += ' — ' + failStep[1].error;
        }
    }

    item.innerHTML = \`
            <div class="item-info">
              <span class="item-id">\${id.slice(0, 8)}</span>
              <span class="item-detail">\${reason}</span>
            </div>\`;

    if (type === 'failed') {
      const btn = document.createElement('button');
      btn.className = 'retry-btn';
      btn.textContent = 'Review';
      btn.onclick = () => openModal(id, reason);
      item.appendChild(btn);
    }
    list.prepend(item);
  }
}

  function addLog(text, type) {
  const entry = document.createElement('div');
  entry.className = 'log-entry ' + (type || '');
  entry.textContent = '[' + new Date().toLocaleTimeString() + '] ' + text;
  logFeed.prepend(entry);
  if (logFeed.children.length > 50) logFeed.lastChild.remove();
}

    // Poll Metrics
    async function updateMetrics() {
        try {
            const res = await fetch('/metrics');
            const data = await res.json();
            const backlogEl = document.getElementById('count-backlog');
            if(backlogEl) backlogEl.textContent = data.backlog >= 0 ? data.backlog : 'ERR';
        } catch(e) { console.error(e); }
    }
    setInterval(updateMetrics, 1000);
    updateMetrics();

function processEvents(events) {
  try {
    const grouped = {};
    if (!events || !Array.isArray(events)) return;

    events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    events.forEach(ev => {
      const id = ev.workflowId;
      const wfName = ev.workflowName || 'unknown-workflow';

      if (!grouped[id]) grouped[id] = { status: 'pending', steps: {}, name: wfName };
      const wf = grouped[id];

      if (ev.type === 'workflow:start') { wf.status = 'running'; wf.name = ev.workflowName; }
      if (ev.type === 'workflow:complete') { wf.status = 'completed'; wf.duration = ev.duration; }

      if (ev.stepName) {
        if (!wf.steps[ev.stepName]) wf.steps[ev.stepName] = { status: 'pending', retries: 0 };
        const step = wf.steps[ev.stepName];
        if (ev.type === 'step:start') step.status = 'running';
        if (ev.type === 'step:retry') {
          step.status = 'running';
          step.retries = ev.retries;
          logUnique(id, ev.stepName, 'retry', 'Retry Initiated: ' + ev.stepName);
        }
        if (ev.type === 'step:complete') step.status = 'completed';
        if (ev.type === 'step:error') {
          step.status = 'failed';
          wf.status = 'failed';
          step.error = ev.error; // Store the error message
          logUnique(id, ev.stepName, 'error', 'Fault Detected: ' + ev.stepName);
        }
      }
    });

    Object.keys(grouped).forEach(id => {
      const state = grouped[id];
      // Always update network view (history card)
      updateNetworkNode(id, state, state.name);

      // Special visualization for Order
      if (state.name === WORKFLOW_ORDER) {
        updateRocket(id, state);
      }
    });
  } catch (e) { console.error('Error processing events', e); }
}

function logUnique(id, step, type, msg) {
  const key = id + step + type;
  if (!stateCache[key]) {
    addLog(msg + ' (' + id.slice(0, 6) + ')', type);
    stateCache[key] = true;
  }
}

// --- Init ---

// 1. Initial Load
fetch('/trace-events')
  .then(res => res.json())
  .then(data => processEvents(data.events))
  .catch(err => console.error('Initial load failed', err));

    // 2. Setup Ripple WebSocket
    console.log('🌊 Connecting to Ripple...');
    
    // Construct WebSocket URL
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = proto + '://' + window.location.host + '/ws';

    const ripple = createRippleClient({
      host: wsUrl
    });

ripple.connect();

const channel = ripple.channel('trace-updates');
channel.listen('update', (data) => {
  // data.events contains the new events
  addLog('⚡ Ripple Update Received', 'success');
  processEvents(data.events);
});

// Launch Handler
document.getElementById('launch-btn').addEventListener('click', async () => {
  const type = document.getElementById('mission-type').value;
  const fail = document.getElementById('force-fail').checked;
  const btn = document.getElementById('launch-btn');

  // Change view if needed
  if (type === WORKFLOW_ORDER && currentView !== 'rocket') switchView('rocket');
  if (type !== WORKFLOW_ORDER && currentView !== 'network') switchView('network');

  let payload = {};

  if (type === WORKFLOW_ORDER) {
    payload = {
      userId: 'cmd-user',
      items: fail ? [{ productId: 'widget-a', qty: 100 }] : [{ productId: 'widget-a', qty: 1 }]
    };
  } else if (type === WORKFLOW_SAGA) {
    payload = {
      userId: 'traveler-1',
      destination: fail ? 'FAIL_CITY' : 'Tokyo', // Trigger Hotel failure
      budget: 2000,
      isPremium: true
    };
    if (fail) {
      // To fail Flight, we need to modify logic, but here "FAIL_CITY" triggers Hotel failure -> Compensation
      addLog('Simulating Regional Blackout (Hotel Failure)...', 'retry');
    }
  } else if (type === WORKFLOW_SUPPLY) {
    payload = {
      origin: 'CN',
      destination: 'US',
      priority: 'express',
      items: [{ sku: 'IPHONE-16', quantity: fail ? 1000 : 50, weight: 0.5, value: 999 }]
      // Fail condition: Weight > 500kg for Express
    };
    if (fail) addLog('Simulating Overweight Cargo...', 'retry');
  }

  btn.disabled = true;
  btn.textContent = 'Transmitting...';

  try {
    await fetch('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowName: type,
        ...payload
      })
    });
    addLog('Command Sent: ' + type.split('-')[1].toUpperCase(), 'success');
  } catch (e) {
    addLog('Transmission Error', 'error');
  } finally {
    setTimeout(() => { btn.disabled = false; btn.textContent = '🚀 INITIALIZE EVENT'; }, 500);
  }
});

window.retryTransaction = async function() {
   const modal = document.getElementById('review-modal');
   const id = modal.dataset.currentId;
   if(!id) return;
   
   addLog('Initiating Retry for ' + id.slice(0,8), 'retry');
   const btn = modal.querySelector('.btn-primary');
   const originalText = btn.textContent;
   btn.disabled = true;
   btn.textContent = 'Retrying...';
   
   try {
     const res = await fetch('/retry', { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id })
     });
     const data = await res.json();
     addLog('Retry Queued: ' + data.id, 'success');
     
     // Update Stats
     const failedEl = document.getElementById('count-failed');
     const recoveredEl = document.getElementById('count-recovered');
     if (failedEl) failedEl.textContent = Math.max(0, parseInt(failedEl.textContent) - 1);
     if (recoveredEl) recoveredEl.textContent = parseInt(recoveredEl.textContent) + 1;

     const originalItem = document.getElementById('attn-' + id);
     if(originalItem) {
        originalItem.innerHTML += ' <span style="margin-left:5px; color:#3fb950">✔</span>';
        setTimeout(() => originalItem.remove(), 2000);
     }
     
     closeModal();
   } catch(e) {
     console.error(e);
     addLog('Retry Failed', 'error');
   } finally {
     btn.disabled = false;
     btn.textContent = originalText;
   }
};

window.closeModal = function() {
       const modal = document.getElementById('review-modal');
       modal.classList.remove('open');
       setTimeout(() => modal.style.display = 'none', 300);
    };

    window.openModal = function(id, reason) {
       const modal = document.getElementById('review-modal');
       modal.dataset.currentId = id; 
       document.getElementById('modal-id').textContent = id;
       document.getElementById('modal-reason').textContent = reason || 'Unknown Error';
       
       modal.style.display = 'flex';
       // Force reflow
       modal.offsetHeight;
       modal.classList.add('open');
    };

window.switchView = switchView; // Expose for debug
</script>
  </body>
  </html>`

console.log(`${env.appName} HTTP server running on port ${env.port}`)
console.log(
  'Navigate to http://localhost:' +
    env.port +
    ' to open the Flux dashboard and POST /orders to enqueue payloads'
)
