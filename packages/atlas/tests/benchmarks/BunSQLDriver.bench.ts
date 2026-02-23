/**
 * BunSQLDriver Performance Benchmarks
 * @description Measure performance of BunSQLDriver core operations
 *
 * Note: These benchmarks focus on SafeQueryBuilder compilation performance
 * and demonstrate the API without requiring complex mocking.
 *
 * Run with: bun --bun tests/benchmarks/BunSQLDriver.bench.ts
 */

import { bench, group, run } from 'mitata'
import { identifier, SafeQueryBuilder } from '../../src/query/SafeQueryBuilder'

group('SafeQueryBuilder - Compilation Performance', () => {
  const userId = 123
  const userName = 'Alice'
  const email = 'alice@example.com'

  bench(
    'Simple SELECT compilation',
    () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [userId]
      )
      return builder.compile('postgres')
    },
    { samples: 10000 }
  )

  bench(
    'Multi-parameter SELECT compilation',
    () => {
      const builder = new SafeQueryBuilder(
        [
          'SELECT * FROM users WHERE id = ',
          ' AND name = ',
          ' AND email = ',
          '',
        ] as unknown as TemplateStringsArray,
        [userId, userName, email]
      )
      return builder.compile('postgres')
    },
    { samples: 5000 }
  )

  bench(
    'INSERT compilation',
    () => {
      const builder = new SafeQueryBuilder(
        ['INSERT INTO users (name, email) VALUES (', ', ', ')'] as unknown as TemplateStringsArray,
        [userName, email]
      )
      return builder.compile('mysql')
    },
    { samples: 5000 }
  )

  bench(
    'SafeIdentifier validation',
    () => {
      return identifier('users')
    },
    { samples: 50000 }
  )

  bench(
    'Dialect detection - PostgreSQL',
    () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [1]
      )
      return builder.compile('postgres')
    },
    { samples: 10000 }
  )

  bench(
    'Dialect detection - MySQL',
    () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [1]
      )
      return builder.compile('mysql')
    },
    { samples: 10000 }
  )

  bench(
    'Dialect detection - SQLite',
    () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [1]
      )
      return builder.compile('sqlite')
    },
    { samples: 10000 }
  )
})

group('SafeQueryBuilder - SQL Injection Prevention', () => {
  const injectionPayload = "Robert'; DROP TABLE users;--"
  const blindSQLPayload = "' OR SLEEP(5)--"
  const unionPayload = "' UNION SELECT * FROM passwords --"

  bench(
    'SQL Injection - Statement injection',
    () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE name = ', ''] as unknown as TemplateStringsArray,
        [injectionPayload]
      )
      return builder.compile()
    },
    { samples: 5000 }
  )

  bench(
    'SQL Injection - Time-based blind',
    () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [blindSQLPayload]
      )
      return builder.compile()
    },
    { samples: 5000 }
  )

  bench(
    'SQL Injection - UNION-based',
    () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [unionPayload]
      )
      return builder.compile()
    },
    { samples: 5000 }
  )
})

group('SafeQueryBuilder - Parameter Binding', () => {
  bench(
    'Simple parameter binding',
    () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users WHERE id = ', ''] as unknown as TemplateStringsArray,
        [1]
      )
      const { bindings } = builder.compile()
      return bindings
    },
    { samples: 10000 }
  )

  bench(
    '5-parameter binding',
    () => {
      const builder = new SafeQueryBuilder(
        [
          'SELECT * FROM users WHERE id = ',
          ' AND a = ',
          ' AND b = ',
          ' AND c = ',
          ' AND d = ',
          '',
        ] as unknown as TemplateStringsArray,
        [1, 'a', 'b', 'c', 'd']
      )
      const { bindings } = builder.compile()
      return bindings
    },
    { samples: 5000 }
  )

  bench(
    '10-parameter binding',
    () => {
      const builder = new SafeQueryBuilder(
        [
          'SELECT * FROM users WHERE id = ',
          ' AND a = ',
          ' AND b = ',
          ' AND c = ',
          ' AND d = ',
          ' AND e = ',
          ' AND f = ',
          ' AND g = ',
          ' AND h = ',
          ' AND i = ',
          '',
        ] as unknown as TemplateStringsArray,
        [1, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
      )
      const { bindings } = builder.compile()
      return bindings
    },
    { samples: 3000 }
  )

  bench(
    'Date parameter conversion',
    () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM events WHERE created = ', ''] as unknown as TemplateStringsArray,
        [new Date()]
      )
      const { bindings } = builder.compile()
      return bindings
    },
    { samples: 5000 }
  )
})

group('SafeQueryBuilder - Mixed Identifiers and Parameters', () => {
  bench(
    'Table identifier + parameter',
    () => {
      const tableName = identifier('users')
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM ', ' WHERE id = ', ''] as unknown as TemplateStringsArray,
        [tableName, 1]
      )
      return builder.compile()
    },
    { samples: 5000 }
  )

  bench(
    'Multiple identifiers + parameters',
    () => {
      const tableName = identifier('users')
      const columnName = identifier('email')
      const builder = new SafeQueryBuilder(
        ['SELECT ', ' FROM ', ' WHERE id = ', ''] as unknown as TemplateStringsArray,
        [columnName, tableName, 1]
      )
      return builder.compile()
    },
    { samples: 5000 }
  )
})

run()
