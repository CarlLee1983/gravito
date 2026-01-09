const pathEl = document.getElementById('tracePath')
const updateEl = document.getElementById('lastUpdate')
const pathElContainer = document.getElementById('path')
const statusEl = document.getElementById('status')
const eventsEl = document.getElementById('events')

const state = {
  events: [],
  lastHash: '',
}

const formatTime = (ts) => new Date(ts).toLocaleTimeString()

const parseNdjson = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)

const hashText = (text) => {
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }
  return String(hash)
}

const renderPath = (events) => {
  const steps = []
  const seen = new Set()
  for (const event of events) {
    if (event.stepName && event.type.startsWith('step:')) {
      if (!seen.has(event.stepName)) {
        seen.add(event.stepName)
        steps.push(event.stepName)
      }
    }
  }

  if (!steps.length) {
    pathElContainer.innerHTML = '<div class="empty">No execution data yet.</div>'
    return
  }

  pathElContainer.innerHTML = steps
    .map((step, index) => {
      const node = `<span class="node">${step}</span>`
      const arrow = index < steps.length - 1 ? '<span class="arrow">-&gt;</span>' : ''
      return `${node}${arrow}`
    })
    .join('')
}

const renderStatus = (events) => {
  if (!events.length) {
    statusEl.innerHTML = '<div class="empty">No trace events.</div>'
    return
  }

  const lastWorkflow = [...events]
    .reverse()
    .find((event) => event.type.startsWith('workflow:'))

  const status = lastWorkflow?.status ?? 'unknown'
  const badgeClass = status === 'completed' ? 'ok' : status === 'failed' ? 'fail' : ''

  statusEl.innerHTML = `
    <div>Workflow: <span class="badge ${badgeClass}">${status}</span></div>
    <div>Workflow ID: ${lastWorkflow?.workflowId ?? '-'}</div>
    <div>Workflow Name: ${lastWorkflow?.workflowName ?? '-'}</div>
    <div>Duration: ${lastWorkflow?.duration ? `${lastWorkflow.duration}ms` : '-'}</div>
  `
}

const renderEvents = (events) => {
  if (!events.length) {
    eventsEl.innerHTML = '<tr><td colspan="6" class="empty">No events yet.</td></tr>'
    return
  }

  eventsEl.innerHTML = events
    .slice()
    .reverse()
    .map((event) => {
      const retry =
        typeof event.retries === 'number'
          ? `${event.retries}${event.maxRetries ? `/${event.maxRetries}` : ''}`
          : '-'
      const duration = event.duration ? `${event.duration}ms` : '-'
      const msg = event.error ?? ''
      return `
        <tr>
          <td>${formatTime(event.timestamp)}</td>
          <td>${event.type}</td>
          <td>${event.stepName ?? '-'}</td>
          <td>${retry}</td>
          <td>${duration}</td>
          <td>${msg}</td>
        </tr>
      `
    })
    .join('')
}

const refresh = async () => {
  const res = await fetch('/trace', { cache: 'no-store' })
  const text = await res.text()
  const hash = hashText(text)
  if (hash === state.lastHash) return

  state.lastHash = hash
  state.events = parseNdjson(text)
  pathEl.textContent = 'Trace: /trace'
  updateEl.textContent = `Updated: ${new Date().toLocaleTimeString()}`

  renderPath(state.events)
  renderStatus(state.events)
  renderEvents(state.events)
}

refresh()
setInterval(refresh, 1500)
