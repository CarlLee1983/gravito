import { describe, expect, it, mock } from 'bun:test'
import { DevMailbox } from '../src/dev/DevMailbox'
import { DevServer } from '../src/dev/DevServer'

const createCore = () => {
  const routes = new Map<string, (ctx: any) => any>()
  const deletes = new Map<string, (ctx: any) => any>()
  const core = {
    router: {
      get: (path: string, handler: (ctx: any) => any) => routes.set(path, handler),
      delete: (path: string, handler: (ctx: any) => any) => deletes.set(path, handler),
    },
    logger: { info: mock(() => {}) },
    routes,
    deletes,
  }
  return core
}

describe('DevServer', () => {
  it('registers mailbox routes and serves entries', async () => {
    const mailbox = new DevMailbox()
    const entry = mailbox.add({
      from: { address: 'from@example.com' },
      to: [{ address: 'to@example.com' }],
      subject: 'Hello',
      html: '<p>Hi</p>',
      priority: 'normal',
    })

    const core = createCore()
    const server = new DevServer(mailbox, '/__mail/', { allowInProduction: true })
    server.register(core as any)

    const list = await core.routes.get('/__mail')?.({
      html: (body: string) => body,
      header: () => {},
    })
    expect(list).toContain('Hello')

    const preview = await core.routes.get('/__mail/:id')?.({
      req: { param: () => entry.id },
      html: (body: string) => body,
      text: () => '',
      header: () => {},
    })
    expect(preview).toContain('Email Preview')

    const raw = await core.routes.get('/__mail/:id/raw')?.({
      req: { param: () => entry.id },
      json: (body: unknown) => body,
    })
    expect((raw as any).id).toBe(entry.id)

    const deleted = await core.deletes.get('/__mail/:id')?.({
      req: { param: () => entry.id },
      json: (body: unknown) => body,
    })
    expect((deleted as any).success).toBe(true)

    const cleared = await core.deletes.get('/__mail')?.({
      json: (body: unknown) => body,
    })
    expect((cleared as any).success).toBe(true)
  })
})
