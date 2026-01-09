import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

type MongoClientOptions = {
  maxPoolSize?: number
  minPoolSize?: number
  connectTimeoutMS?: number
  socketTimeoutMS?: number
}

const createdClients: Array<{
  uri: string
  options: MongoClientOptions | undefined
  instance: MongoClientMock
}> = []

class MongoQueryBuilderMock {
  constructor(
    public collection: Record<string, unknown>,
    public name: string
  ) {}
}

const createDbMock = () => ({
  collection: (name: string) => ({ name }),
  listCollections: () => ({
    toArray: async () => [{ name: 'users' }, { name: 'posts' }],
  }),
  dropCollection: async (_name: string) => true,
  createCollection: async (_name: string) => {},
})

class MongoClientMock {
  public uri: string
  public options?: MongoClientOptions

  constructor(uri: string, options?: MongoClientOptions) {
    this.uri = uri
    this.options = options
    createdClients.push({ uri, options, instance: this })
  }

  async connect() {}

  async close() {}

  db(_name?: string) {
    return createDbMock()
  }
}

mock.module('mongodb', () => ({ MongoClient: MongoClientMock }))
mock.module('../src/MongoQueryBuilder', () => ({
  MongoQueryBuilder: MongoQueryBuilderMock,
  MongoAggregateBuilder: class {},
}))

let Mongo: typeof import('../src/Mongo').Mongo
let MongoClient: typeof import('../src/MongoClient').MongoClient
let MongoManager: typeof import('../src/MongoManager').MongoManager

beforeAll(async () => {
  ;({ Mongo } = await import('../src/Mongo'))
  ;({ MongoClient } = await import('../src/MongoClient'))
  ;({ MongoManager } = await import('../src/MongoManager'))
})

beforeEach(() => {
  createdClients.length = 0
})

describe('Mongo', () => {
  it('configures and returns connections', () => {
    Mongo.configure({
      default: 'main',
      connections: {
        main: { uri: 'mongodb://localhost:27017', database: 'test' },
      },
    })

    expect(() =>
      Mongo.addConnection('analytics', { uri: 'mongodb://localhost:27017' })
    ).not.toThrow()
    expect(Mongo.connection()).toBeDefined()
  })

  it('connects and disconnects via facade', async () => {
    Mongo.configure({
      default: 'main',
      connections: {
        main: { uri: 'mongodb://localhost:27017', database: 'test' },
      },
    })

    await Mongo.connect()
    expect(Mongo.isConnected()).toBe(true)
    await Mongo.disconnect()
    expect(Mongo.isConnected()).toBe(false)
  })
})

describe('MongoManager', () => {
  let manager: InstanceType<typeof MongoManager>

  beforeEach(() => {
    manager = new MongoManager()
  })

  it('connects all configured connections', async () => {
    manager.configure({
      default: 'main',
      connections: {
        main: { uri: 'mongodb://localhost:27017', database: 'test' },
        secondary: { uri: 'mongodb://localhost:27018', database: 'test2' },
      },
    })

    await manager.connectAll()
    expect(createdClients.length).toBe(2)
  })

  it('disconnects and clears all connections', async () => {
    manager.configure({
      default: 'main',
      connections: {
        main: { uri: 'mongodb://localhost:27017', database: 'test' },
      },
    })

    manager.connection('main')
    await manager.disconnectAll()
    expect(() => manager.connection('main')).not.toThrow()
  })

  it('removes a connection configuration', async () => {
    manager.configure({
      default: 'main',
      connections: {
        main: { uri: 'mongodb://localhost:27017', database: 'test' },
      },
    })

    manager.connection('main')
    await manager.removeConnection('main')
    expect(manager.hasConnection('main')).toBe(false)
  })
})

describe('MongoClient', () => {
  it('builds connection uri with credentials and options', async () => {
    const client = new MongoClient({
      host: 'mongo.example.com',
      port: 27018,
      database: 'myapp',
      username: 'user',
      password: 'pass',
      authSource: 'admin',
      replicaSet: 'rs0',
      maxPoolSize: 20,
      minPoolSize: 2,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    })

    await client.connect()

    expect(createdClients[0].uri).toBe(
      'mongodb://user:pass@mongo.example.com:27018/myapp?authSource=admin&replicaSet=rs0'
    )
    expect(createdClients[0].options?.maxPoolSize).toBe(20)
    expect(createdClients[0].options?.minPoolSize).toBe(2)
    expect(createdClients[0].options?.connectTimeoutMS).toBe(5000)
    expect(createdClients[0].options?.socketTimeoutMS).toBe(10000)
  })

  it('returns query builder from collection and database wrapper', async () => {
    const client = new MongoClient({ uri: 'mongodb://localhost:27017', database: 'test' })
    await client.connect()

    const query = client.collection('users')
    expect(query).toBeInstanceOf(MongoQueryBuilderMock)
    expect(query.name).toBe('users')

    const db = client.database()
    const collections = await db.listCollections()
    expect(collections).toEqual(['users', 'posts'])
    expect(await db.dropCollection('users')).toBe(true)
    await db.createCollection('logs')
  })
})

describe('Types', () => {
  it('exports expected public api', async () => {
    const module = await import('../src')
    expect(module.Mongo).toBeDefined()
    expect(module.MongoClient).toBeDefined()
    expect(module.MongoManager).toBeDefined()
    expect(module.MongoQueryBuilder).toBeDefined()
    expect(module.MongoAggregateBuilder).toBeDefined()
  })
})
