import { EventEmitter } from 'events'

export function createMockRedis() {
  const store = new Map<string, string>()
  const lists = new Map<string, string[]>()

  return {
    status: 'ready',
    async connect() {},
    async quit() {},
    async set(key: string, value: string) {
      store.set(key, value)
      return 'OK'
    },
    async get(key: string) {
      return store.get(key) || null
    },
    getStore() {
      return store
    },
    getLists() {
      return lists
    },
    async lpush(key: string, ...values: string[]) {
      const list = lists.get(key) || []
      list.unshift(...values)
      lists.set(key, list)
      return list.length
    },
    async ltrim(key: string, start: number, stop: number) {
      const list = lists.get(key) || []
      lists.set(key, list.slice(start, stop + 1))
      return 'OK'
    },
    async publish(channel: string, message: string) {
      return 0
    },
    on: () => {},
    pipeline() {
      const commands: Array<{ cmd: string; args: any[] }> = []
      const pipeline = {
        llen: (key: string) => {
          commands.push({ cmd: 'llen', args: [key] })
          return pipeline
        },
        zcard: (key: string) => {
          commands.push({ cmd: 'zcard', args: [key] })
          return pipeline
        },
        scard: (key: string) => {
          commands.push({ cmd: 'scard', args: [key] })
          return pipeline
        },
        lpush: (key: string, ...values: string[]) => {
          commands.push({ cmd: 'lpush', args: [key, ...values] })
          return pipeline
        },
        ltrim: (key: string, start: number, stop: number) => {
          commands.push({ cmd: 'ltrim', args: [key, start, stop] })
          return pipeline
        },
        publish: (channel: string, message: string) => {
          commands.push({ cmd: 'publish', args: [channel, message] })
          return pipeline
        },
        async exec() {
          return commands.map(({ cmd }) => [
            null,
            cmd === 'llen' ? 0 : cmd === 'zcard' ? 0 : cmd === 'scard' ? 0 : 'OK',
          ])
        },
      }
      return pipeline
    },
  }
}

export function createMockWorker(queueName = 'test-queue') {
  const emitter = new EventEmitter()
  return {
    name: queueName,
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    emit: emitter.emit.bind(emitter),
  }
}
