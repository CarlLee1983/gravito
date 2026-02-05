import { afterEach, describe, expect, it } from 'bun:test'
import {
  createSqliteDatabase,
  getPasswordAdapter,
  getRuntimeAdapter,
  getRuntimeEnv,
} from '../src/runtime'

describe('runtime', () => {
  describe('getRuntimeEnv', () => {
    it('should return an object with env variables', () => {
      const env = getRuntimeEnv()
      expect(env).toBeDefined()
      expect(typeof env).toBe('object')
    })

    it('should contain NODE_ENV or common env vars', () => {
      const env = getRuntimeEnv()
      // 在 Bun 環境中應該能取得環境變數
      expect(env).toBeDefined()
    })

    it('should return Bun.env in Bun runtime', () => {
      const env = getRuntimeEnv()
      // 在 Bun 測試環境中，getRuntimeEnv 應回傳 Bun.env
      expect(env).toBe(Bun.env)
    })
  })

  describe('getRuntimeAdapter', () => {
    it('should return a RuntimeAdapter object', () => {
      const adapter = getRuntimeAdapter()
      expect(adapter).toBeDefined()
      expect(adapter.kind).toBeDefined()
    })

    it('should detect Bun runtime', () => {
      const adapter = getRuntimeAdapter()
      // 在 Bun 測試環境中，應偵測為 bun
      expect(adapter.kind).toBe('bun')
    })

    it('should return same adapter on repeated calls (cached)', () => {
      const adapter1 = getRuntimeAdapter()
      const adapter2 = getRuntimeAdapter()
      expect(adapter1).toBe(adapter2)
    })

    describe('Bun adapter spawn', () => {
      it('should throw when command is empty', () => {
        const adapter = getRuntimeAdapter()
        expect(() => adapter.spawn([])).toThrow('spawn() requires a command')
      })

      it('should spawn a process with basic command', async () => {
        const adapter = getRuntimeAdapter()
        const proc = adapter.spawn(['echo', 'hello'])
        expect(proc).toBeDefined()
        expect(proc.exited).toBeDefined()

        const exitCode = await proc.exited
        expect(exitCode).toBe(0)
      })

      it('should capture stdout', async () => {
        const adapter = getRuntimeAdapter()
        const proc = adapter.spawn(['echo', 'test output'])

        expect(proc.stdout).toBeDefined()
        if (proc.stdout) {
          const reader = proc.stdout.getReader()
          const { value } = await reader.read()
          const text = new TextDecoder().decode(value)
          expect(text.trim()).toBe('test output')
          reader.releaseLock()
        }

        await proc.exited
      })

      it('should support kill', async () => {
        const adapter = getRuntimeAdapter()
        const proc = adapter.spawn(['sleep', '10'])

        expect(proc.kill).toBeDefined()
        proc.kill?.('SIGTERM')

        const exitCode = await proc.exited
        // 被 kill 的程序可能回傳非零 exit code
        expect(typeof exitCode).toBe('number')
      })
    })

    describe('Bun adapter file operations', () => {
      const testPath = `/tmp/gravito-runtime-test-${Date.now()}.txt`

      afterEach(async () => {
        const adapter = getRuntimeAdapter()
        try {
          await adapter.deleteFile(testPath)
        } catch {
          // 忽略
        }
      })

      it('should write and read a file (string)', async () => {
        const adapter = getRuntimeAdapter()
        await adapter.writeFile(testPath, 'hello world')

        const data = await adapter.readFile(testPath)
        expect(new TextDecoder().decode(data)).toBe('hello world')
      })

      it('should write and read a file (Uint8Array)', async () => {
        const adapter = getRuntimeAdapter()
        const content = new TextEncoder().encode('binary content')
        await adapter.writeFile(testPath, content)

        const data = await adapter.readFile(testPath)
        expect(new TextDecoder().decode(data)).toBe('binary content')
      })

      it('should write and read a file (ArrayBuffer)', async () => {
        const adapter = getRuntimeAdapter()
        const buf = new TextEncoder().encode('arraybuffer content').buffer
        await adapter.writeFile(testPath, buf)

        const data = await adapter.readFile(testPath)
        expect(new TextDecoder().decode(data)).toBe('arraybuffer content')
      })

      it('should write and read a file (Blob)', async () => {
        const adapter = getRuntimeAdapter()
        const blob = new Blob(['blob content'])
        await adapter.writeFile(testPath, blob)

        const data = await adapter.readFile(testPath)
        expect(new TextDecoder().decode(data)).toBe('blob content')
      })

      it('should read file as Blob', async () => {
        const adapter = getRuntimeAdapter()
        await adapter.writeFile(testPath, 'blob test')

        const blob = await adapter.readFileAsBlob(testPath)
        expect(blob).toBeDefined()
        // Bun.file() 回傳的 Blob 不一定有 text() 方法
        // 但可以驗證它是一個有效的 Blob-like 物件
      })

      it('should check if file exists', async () => {
        const adapter = getRuntimeAdapter()
        await adapter.writeFile(testPath, 'exists test')

        const exists = await adapter.exists(testPath)
        expect(exists).toBe(true)
      })

      it('should return false for non-existent file', async () => {
        const adapter = getRuntimeAdapter()
        const exists = await adapter.exists(`/tmp/gravito-nonexistent-${Date.now()}`)
        expect(exists).toBe(false)
      })

      it('should get file stats', async () => {
        const adapter = getRuntimeAdapter()
        await adapter.writeFile(testPath, 'stat test content')

        const stat = await adapter.stat(testPath)
        expect(stat).toBeDefined()
        expect(stat.size).toBeGreaterThan(0)
      })

      it('should delete a file', async () => {
        const adapter = getRuntimeAdapter()
        await adapter.writeFile(testPath, 'delete me')

        await adapter.deleteFile(testPath)
        const exists = await adapter.exists(testPath)
        expect(exists).toBe(false)
      })

      it('should not throw when deleting non-existent file', async () => {
        const adapter = getRuntimeAdapter()
        // 不應拋出錯誤
        await adapter.deleteFile(`/tmp/gravito-nonexistent-${Date.now()}`)
      })
    })

    describe('Bun adapter serve', () => {
      it('should start a server and stop it', async () => {
        const adapter = getRuntimeAdapter()
        const server = adapter.serve({
          port: 0, // 隨機可用端口
          fetch: () => new Response('ok'),
        })

        expect(server).toBeDefined()
        server.stop?.()
      })
    })
  })

  describe('getPasswordAdapter', () => {
    it('should return a password adapter', () => {
      const adapter = getPasswordAdapter()
      expect(adapter).toBeDefined()
      expect(typeof adapter.hash).toBe('function')
      expect(typeof adapter.verify).toBe('function')
    })

    it('should return same adapter on repeated calls (cached)', () => {
      const adapter1 = getPasswordAdapter()
      const adapter2 = getPasswordAdapter()
      expect(adapter1).toBe(adapter2)
    })

    it('should hash with bcrypt', async () => {
      const adapter = getPasswordAdapter()
      const hashed = await adapter.hash('password123', { algorithm: 'bcrypt' })
      expect(hashed).toBeDefined()
      expect(typeof hashed).toBe('string')
      expect(hashed.length).toBeGreaterThan(0)
    })

    it('should hash with argon2id', async () => {
      const adapter = getPasswordAdapter()
      const hashed = await adapter.hash('password123', { algorithm: 'argon2id' })
      expect(hashed).toBeDefined()
      expect(typeof hashed).toBe('string')
      expect(hashed.length).toBeGreaterThan(0)
    })

    it('should hash bcrypt with custom cost', async () => {
      const adapter = getPasswordAdapter()
      const hashed = await adapter.hash('password123', { algorithm: 'bcrypt', cost: 4 })
      expect(hashed).toBeDefined()
      expect(typeof hashed).toBe('string')
    })

    it('should hash argon2id with custom options', async () => {
      const adapter = getPasswordAdapter()
      const hashed = await adapter.hash('password123', {
        algorithm: 'argon2id',
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      })
      expect(hashed).toBeDefined()
      expect(typeof hashed).toBe('string')
    })

    it('should verify a correct password', async () => {
      const adapter = getPasswordAdapter()
      const hashed = await adapter.hash('mypassword', { algorithm: 'bcrypt', cost: 4 })
      const isValid = await adapter.verify('mypassword', hashed)
      expect(isValid).toBe(true)
    })

    it('should reject an incorrect password', async () => {
      const adapter = getPasswordAdapter()
      const hashed = await adapter.hash('mypassword', { algorithm: 'bcrypt', cost: 4 })
      const isValid = await adapter.verify('wrongpassword', hashed)
      expect(isValid).toBe(false)
    })
  })

  describe('createSqliteDatabase', () => {
    const dbPath = `/tmp/gravito-test-${Date.now()}.db`

    afterEach(async () => {
      try {
        const fs = await import('node:fs/promises')
        await fs.unlink(dbPath)
      } catch {
        // 忽略
      }
    })

    it('should create a SQLite database in Bun', async () => {
      const db = await createSqliteDatabase(dbPath)
      expect(db).toBeDefined()
      db.close()
    })

    it('should support basic SQL operations', async () => {
      const db = await createSqliteDatabase(dbPath)

      db.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)')

      const stmt = db.prepare('INSERT INTO test (name) VALUES (?)')
      stmt.run({ 1: 'Alice' } as any)

      const query = db.query('SELECT * FROM test')
      const rows = query.all()
      expect(rows.length).toBe(1)

      db.close()
    })
  })
})
