/**
 * Driver Comparison Benchmarks
 * @description Compare SafeQueryBuilder performance across different database dialects
 *
 * Helps identify performance characteristics and optimization opportunities
 * across PostgreSQL, MySQL, and SQLite dialects.
 *
 * Run with: bun --bun tests/benchmarks/DriverComparison.bench.ts
 */

import { bench, group, run } from 'mitata'
import { SafeQueryBuilder } from '../../src/query/SafeQueryBuilder'

group('Dialect Comparison - Simple SELECT', () => {
  bench(
    'PostgreSQL - Simple SELECT',
    () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users LIMIT ', ''] as unknown as TemplateStringsArray,
        [10]
      )
      return builder.compile('postgres')
    },
    { samples: 10000 }
  )

  bench(
    'MySQL - Simple SELECT',
    () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users LIMIT ', ''] as unknown as TemplateStringsArray,
        [10]
      )
      return builder.compile('mysql')
    },
    { samples: 10000 }
  )

  bench(
    'SQLite - Simple SELECT',
    () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM users LIMIT ', ''] as unknown as TemplateStringsArray,
        [10]
      )
      return builder.compile('sqlite')
    },
    { samples: 10000 }
  )
})

group('Dialect Comparison - Parameterized Queries', () => {
  bench(
    'PostgreSQL - 5 parameters',
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
      return builder.compile('postgres')
    },
    { samples: 5000 }
  )

  bench(
    'MySQL - 5 parameters',
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
      return builder.compile('mysql')
    },
    { samples: 5000 }
  )

  bench(
    'SQLite - 5 parameters',
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
      return builder.compile('sqlite')
    },
    { samples: 5000 }
  )
})

group('Dialect Comparison - Complex Queries', () => {
  bench(
    'PostgreSQL - 10 parameters',
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
      return builder.compile('postgres')
    },
    { samples: 3000 }
  )

  bench(
    'MySQL - 10 parameters',
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
      return builder.compile('mysql')
    },
    { samples: 3000 }
  )

  bench(
    'SQLite - 10 parameters',
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
      return builder.compile('sqlite')
    },
    { samples: 3000 }
  )
})

group('Dialect Comparison - Placeholder Styles', () => {
  bench(
    'PostgreSQL - $1, $2, $3 placeholders',
    () => {
      const builder = new SafeQueryBuilder(
        [
          'SELECT * FROM users WHERE id = ',
          ' AND name = ',
          ' AND active = ',
          '',
        ] as unknown as TemplateStringsArray,
        [1, 'Alice', true]
      )
      const result = builder.compile('postgres')
      return result.sql
    },
    { samples: 10000 }
  )

  bench(
    'MySQL - ? placeholders',
    () => {
      const builder = new SafeQueryBuilder(
        [
          'SELECT * FROM users WHERE id = ',
          ' AND name = ',
          ' AND active = ',
          '',
        ] as unknown as TemplateStringsArray,
        [1, 'Alice', true]
      )
      const result = builder.compile('mysql')
      return result.sql
    },
    { samples: 10000 }
  )

  bench(
    'SQLite - ? placeholders',
    () => {
      const builder = new SafeQueryBuilder(
        [
          'SELECT * FROM users WHERE id = ',
          ' AND name = ',
          ' AND active = ',
          '',
        ] as unknown as TemplateStringsArray,
        [1, 'Alice', true]
      )
      const result = builder.compile('sqlite')
      return result.sql
    },
    { samples: 10000 }
  )
})

group('Dialect Comparison - Date/Type Conversions', () => {
  bench(
    'PostgreSQL - Date parameter',
    () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM events WHERE created = ', ''] as unknown as TemplateStringsArray,
        [new Date()]
      )
      return builder.compile('postgres')
    },
    { samples: 5000 }
  )

  bench(
    'MySQL - Date parameter',
    () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM events WHERE created = ', ''] as unknown as TemplateStringsArray,
        [new Date()]
      )
      return builder.compile('mysql')
    },
    { samples: 5000 }
  )

  bench(
    'SQLite - Date parameter',
    () => {
      const builder = new SafeQueryBuilder(
        ['SELECT * FROM events WHERE created = ', ''] as unknown as TemplateStringsArray,
        [new Date()]
      )
      return builder.compile('sqlite')
    },
    { samples: 5000 }
  )
})

run()
