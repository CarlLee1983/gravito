import { describe, expect, it, mock } from 'bun:test'
import { LogTransport } from '../src/transports/LogTransport'

describe('LogTransport', () => {
  it('logs formatted output', async () => {
    const originalLog = console.log
    console.log = mock(() => {})

    const transport = new LogTransport()
    await transport.send({
      from: { address: 'from@example.com' },
      to: [{ address: 'to@example.com' }],
      subject: 'Hello',
      html: '<p>Hi</p>',
      priority: 'normal',
    })

    expect((console.log as any).mock.calls.length).toBeGreaterThan(0)
    console.log = originalLog
  })
})
