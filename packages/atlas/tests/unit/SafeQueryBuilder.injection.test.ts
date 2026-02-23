/**
 * SafeQueryBuilder - SQL Injection Protection Tests
 * @description 驗證 tagged template literal 防止 SQL 注入的能力
 */

import { describe, expect, it } from 'bun:test'
import { identifier, SafeQueryBuilder } from '../../src/query/SafeQueryBuilder'

describe('SafeQueryBuilder - SQL 注入防護', () => {
  const injectionPayloads = [
    "Robert'; DROP TABLE users;--",
    '1 OR 1=1',
    '1; DELETE FROM users',
    "' UNION SELECT * FROM passwords --",
    "1' AND '1'='1",
    '"; DROP TABLE users; --',
    "' OR ''='",
    "admin'--",
    '1/**/OR/**/1=1',
    "' AND (SELECT COUNT(*) FROM users)>0 --",
    "1' OR SLEEP(5)--",
    "' UNION ALL SELECT NULL--",
    "BENCHMARK(10000000,MD5('A'))--",
    "' OR 'x'='x",
    "1' UNION SELECT NULL,NULL,NULL--",
  ]

  describe('參數綁定保護', () => {
    for (const payload of injectionPayloads) {
      it(`應該安全處理注入嘗試: "${payload.slice(0, 30)}..."`, () => {
        const builder = new SafeQueryBuilder(
          ['SELECT * FROM users WHERE name = ', ''] as unknown as TemplateStringsArray,
          [payload]
        )

        const { sql, bindings } = builder.compile('postgres')

        // SQL 應只包含參數佔位符，不包含 payload
        expect(sql).toBe('SELECT * FROM users WHERE name = $1')

        // Payload 應在 bindings 中（作為安全的參數）
        expect(bindings).toEqual([payload])

        // Payload 不應在 SQL 字串中
        expect(sql).not.toContain(payload)
        expect(sql).not.toContain(';')
        expect(sql).not.toContain('DROP')
        expect(sql).not.toContain('DELETE')
        expect(sql).not.toContain('UNION')
      })
    }
  })

  describe('多參數注入防護', () => {
    it('應該保護多個參數中的注入', () => {
      const payload1 = "admin'; --"
      const payload2 = "' OR '1'='1"

      const builder = new SafeQueryBuilder(
        [
          'SELECT * FROM users WHERE username = ',
          ' AND password = ',
          '',
        ] as unknown as TemplateStringsArray,
        [payload1, payload2]
      )

      const { sql, bindings } = builder.compile('postgres')

      expect(sql).toBe('SELECT * FROM users WHERE username = $1 AND password = $2')
      expect(bindings).toEqual([payload1, payload2])
    })
  })

  describe('SafeIdentifier 識別符白名單保護', () => {
    it('應該接受合法的識別符', () => {
      const tableName = identifier('users')
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM ', ' WHERE id = ', ''] as unknown as TemplateStringsArray,
        [tableName, 1]
      )

      const { sql, bindings } = builder.compile()

      expect(sql).toContain('users')
      expect(bindings).toEqual([1])
    })

    it('應該拒絕在 identifier() 中進行 SQL 注入', () => {
      expect(() => {
        identifier("users'; DROP TABLE--")
      }).toThrow()
    })

    it('應該拒絕在 identifier() 中的特殊字元', () => {
      const invalidIdentifiers = [
        'users;',
        'users--',
        "users'",
        'users/*',
        'users*/',
        'users"',
        'users`',
        'users$',
        'users@',
        'users!',
      ]

      for (const invalidId of invalidIdentifiers) {
        expect(() => {
          identifier(invalidId)
        }).toThrow(`Invalid SQL identifier`)
      }
    })
  })

  describe('Type 轉換保護', () => {
    it('應該安全處理 null 值', () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE email = ', ''] as unknown as TemplateStringsArray,
        [null]
      )

      const { sql, bindings } = builder.compile('mysql')

      expect(bindings).toEqual([null])
      expect(sql).toBe('SELECT * FROM users WHERE email = ?')
    })

    it('應該安全處理 undefined 值', () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE email = ', ''] as unknown as TemplateStringsArray,
        [undefined]
      )

      const { bindings } = builder.compile('mysql')

      expect(bindings).toEqual([undefined])
    })

    it('應該安全處理物件值', () => {
      const obj = { id: 1, name: 'test' }
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE data = ', ''] as unknown as TemplateStringsArray,
        [obj]
      )

      const { sql, bindings } = builder.compile('mysql')

      expect(bindings[0]).toBe(obj)
      expect(sql).toBe('SELECT * FROM users WHERE data = ?')
    })

    it('應該安全處理 JSON 字串', () => {
      const jsonString = JSON.stringify({ id: 1, action: 'DROP TABLE' })
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM logs WHERE data = ', ''] as unknown as TemplateStringsArray,
        [jsonString]
      )

      const { sql, bindings } = builder.compile('mysql')

      // JSON 內容應在 bindings 中，而不是 SQL 中
      expect(bindings).toEqual([jsonString])
      expect(sql).not.toContain('DROP')
    })
  })

  describe('複雜注入攻擊場景', () => {
    it('應該防護時間盲注 (Time-based Blind SQL Injection)', () => {
      const payload = "' OR SLEEP(5)--"
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [payload]
      )

      const { sql, bindings } = builder.compile()

      expect(bindings).toEqual([payload])
      expect(sql).not.toContain('SLEEP')
    })

    it('應該防護錯誤盲注 (Error-based Blind SQL Injection)', () => {
      const payload = "' AND (SELECT COUNT(*) FROM users)>0--"
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE name = ', ''] as unknown as TemplateStringsArray,
        [payload]
      )

      const { sql, bindings } = builder.compile()

      expect(bindings).toEqual([payload])
      expect(sql).not.toContain('SELECT COUNT')
    })

    it('應該防護聯合查詢注入 (UNION-based Injection)', () => {
      const payload = "' UNION SELECT NULL,username,password FROM admin--"
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [payload]
      )

      const { sql, bindings } = builder.compile()

      expect(bindings).toEqual([payload])
      expect(sql).not.toContain('UNION')
    })

    it('應該防護堆疊查詢 (Stacked Queries)', () => {
      const payload = '1; DROP TABLE users;--'
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [payload]
      )

      const { sql, bindings } = builder.compile()

      expect(bindings).toEqual([payload])
      expect(sql).not.toContain(';')
    })

    it('應該防護註解繞過', () => {
      const payloads = ["admin'/**/OR/**/1=1--", "admin'--+select+1", "admin'#", "admin'%23"]

      for (const payload of payloads) {
        const builder = new SafeQueryBuilder(
          ['SELECT * FROM users WHERE username = ', ''] as unknown as TemplateStringsArray,
          [payload]
        )

        const { sql, bindings } = builder.compile()

        expect(bindings).toEqual([payload])
        expect(sql).not.toContain('/*')
        expect(sql).not.toContain('--')
        expect(sql).not.toContain('#')
      }
    })
  })

  describe('方言特定的注入防護', () => {
    it('PostgreSQL 應使用 $N 佔位符防護', () => {
      const payload = "'; DROP TABLE users;--"
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [payload]
      )

      const { sql } = builder.compile('postgres')

      expect(sql).toBe('SELECT * FROM users WHERE id = $1')
      expect(sql).not.toContain(payload)
    })

    it('MySQL 應使用 ? 佔位符防護', () => {
      const payload = "'; DELETE FROM users;--"
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [payload]
      )

      const { sql } = builder.compile('mysql')

      expect(sql).toBe('SELECT * FROM users WHERE id = ?')
      expect(sql).not.toContain(payload)
    })

    it('SQLite 應使用 ? 佔位符防護', () => {
      const payload = '1 OR 1=1'
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [payload]
      )

      const { sql } = builder.compile('sqlite')

      expect(sql).toBe('SELECT * FROM users WHERE id = ?')
      expect(sql).not.toContain('OR')
    })
  })

  describe('邊界情況', () => {
    it('應該處理空字串', () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE name = ', ''] as unknown as TemplateStringsArray,
        ['']
      )

      const { sql, bindings } = builder.compile('mysql')

      expect(bindings).toEqual([''])
      expect(sql).toBe('SELECT * FROM users WHERE name = ?')
    })

    it('應該處理長字串', () => {
      const longPayload = 'a'.repeat(10000)
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE data = ', ''] as unknown as TemplateStringsArray,
        [longPayload]
      )

      const { sql, bindings } = builder.compile('mysql')

      expect(bindings).toEqual([longPayload])
      // SQL 長度應固定（不因 payload 長度而變化）
      expect(sql).toBe('SELECT * FROM users WHERE data = ?')
    })

    it('應該處理特殊字元組合', () => {
      const payload = "\n\r\t;--/**/'"
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE data = ', ''] as unknown as TemplateStringsArray,
        [payload]
      )

      const { sql, bindings } = builder.compile('mysql')

      expect(bindings).toEqual([payload])
      // 特殊字元應在 bindings 中，不在 SQL 中
      expect(sql).toBe('SELECT * FROM users WHERE data = ?')
      // SQL 不應包含危險的 SQL 語法字元
      expect(sql).not.toContain(';')
      expect(sql).not.toContain('--')
      expect(sql).not.toContain('/*')
    })
  })

  describe('混合 SafeIdentifier 和注入防護', () => {
    it('應該在同時使用識別符和參數時防護', () => {
      const tableName = identifier('users')
      const injectionPayload = "'; DROP TABLE users;--"

      const builder = new SafeQueryBuilder(
        ['SELECT * FROM ', ' WHERE username = ', ''] as unknown as TemplateStringsArray,
        [tableName, injectionPayload]
      )

      const { sql, bindings } = builder.compile('postgres')

      expect(sql).toBe('SELECT * FROM users WHERE username = $1')
      expect(bindings).toEqual([injectionPayload])
    })

    it('應該拒絕在識別符中混合 SQL 和數據', () => {
      expect(() => {
        identifier("users'; DROP TABLE--")
      }).toThrow()
    })
  })
})
