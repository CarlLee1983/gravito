import { describe, expect, it } from 'bun:test'
import { Container } from '../src/Container'

class Logger {
  log(msg: string) {
    return msg
  }
}

class Database {
  connect() {
    return true
  }
}

declare module '../src/Container' {
  interface ServiceMap {
    logger: Logger
    db: Database
  }
}

describe('ServiceMap Type Safety', () => {
  it('should resolve services registered in ServiceMap', () => {
    const container = new Container()

    container.bind('logger', () => new Logger())
    container.singleton('db', () => new Database())

    const logger = container.make('logger')
    expect(logger).toBeInstanceOf(Logger)
    expect(logger.log('test')).toBe('test')

    const db = container.make('db')
    expect(db).toBeInstanceOf(Database)
    expect(db.connect()).toBe(true)
  })

  it('should still support string keys not in ServiceMap (backward compatibility)', () => {
    const container = new Container()
    container.bind('custom', () => 'value')

    const value = container.make<string>('custom')
    expect(value).toBe('value')
  })

  it('should infer concrete type without explicit cast', () => {
    const container = new Container()
    container.bind('logger', () => new Logger())
    container.singleton('db', () => new Database())

    const logger = container.make('logger')
    const _loggerCheck: Logger = logger // compile error if inferred as any
    expect(logger).toBeInstanceOf(Logger)
    expect(logger.log('test')).toBe('test')

    const db = container.make('db')
    const _dbCheck: Database = db // compile error if inferred as any
    expect(db).toBeInstanceOf(Database)
    expect(db.connect()).toBe(true)
  })

  it('should support generic cast for keys not in ServiceMap', () => {
    const container = new Container()
    container.bind('unknown-service', () => 42)

    const value = container.make<number>('unknown-service')
    expect(value).toBe(42)
  })
})
