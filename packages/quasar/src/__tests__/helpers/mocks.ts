import { EventEmitter } from 'events'

export function createMockRedis() {
  const store = new Map<string, string>()
  const lists = new Map<string, string[]>()
  const handlers = new Map<string, Function[]>()

  return {
    status: 'ready',
    options: { mock: true },
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
    async subscribe(channel: string) {},
    async psubscribe(pattern: string) {},
    async unsubscribe() {},
    async punsubscribe() {},
    async lrem(key: string, count: number, element: string) {
      const list = lists.get(key) || []
      const index = list.indexOf(element)
      if (index > -1) {
        list.splice(index, 1)
        lists.set(key, list)
        return 1
      }
      return 0
    },
    async lrange(key: string, start: number, stop: number) {
      const list = lists.get(key) || []
      return list.slice(start, stop === -1 ? undefined : stop + 1)
    },
    on(event: string, callback: Function) {
      if (!handlers.has(event)) {
        handlers.set(event, [])
      }
      handlers.get(event)!.push(callback)
    },
    emitMessage(channel: string, message: string) {
      handlers.get('message')?.forEach((cb) => {
        cb(channel, message)
      })
    },
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
        set: (key: string, value: string, ...args: any[]) => {
          commands.push({ cmd: 'set', args: [key, value, ...args] })
          return pipeline
        },
        publish: (channel: string, message: string) => {
          commands.push({ cmd: 'publish', args: [channel, message] })
          return pipeline
        },
        async exec() {
          const results = commands.map(({ cmd, args }) => {
            if (cmd === 'lpush') {
              const [key, ...values] = args
              const list = lists.get(key) || []
              list.unshift(...values)
              lists.set(key, list)
            } else if (cmd === 'ltrim') {
              const [key, start, stop] = args
              const list = lists.get(key) || []
              lists.set(key, list.slice(start, stop + 1))
            } else if (cmd === 'set') {
              const [key, value] = args
              store.set(key, value)
            }
            return [null, cmd === 'llen' ? 0 : cmd === 'zcard' ? 0 : cmd === 'scard' ? 0 : 'OK']
          })
          return results
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
