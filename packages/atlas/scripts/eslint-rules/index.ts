/**
 * @gravito/eslint-plugin-atlas
 *
 * ESLint plugin for detecting SQL injection vulnerabilities and unsafe query patterns
 * in applications using @gravito/atlas.
 *
 * Rules:
 * - no-unsafe-raw: Detect db.raw() with unsafe patterns
 * - sql-injection-risk: Detect potential SQL injection vulnerabilities
 * - safe-identifier-required: Enforce identifier() for dynamic names
 * - missing-type-parameter: Suggest type parameters for db.sql
 */

import noUnsafeRaw from './no-unsafe-raw'
import sqlInjectionRisk from './sql-injection-risk'

const plugin = {
  meta: {
    name: '@gravito/eslint-plugin-atlas',
    version: '1.0.0',
  },

  rules: {
    'no-unsafe-raw': noUnsafeRaw,
    'sql-injection-risk': sqlInjectionRisk,
  },

  configs: {
    recommended: {
      plugins: {
        atlas: {
          rules: {
            'no-unsafe-raw': noUnsafeRaw,
            'sql-injection-risk': sqlInjectionRisk,
          },
        },
      },
      rules: {
        'atlas/no-unsafe-raw': ['warn', { allowLiterals: true }],
        'atlas/sql-injection-risk': 'error',
      },
    },

    strict: {
      plugins: {
        atlas: {
          rules: {
            'no-unsafe-raw': noUnsafeRaw,
            'sql-injection-risk': sqlInjectionRisk,
          },
        },
      },
      rules: {
        'atlas/no-unsafe-raw': ['error', { allowLiterals: false }],
        'atlas/sql-injection-risk': 'error',
      },
    },
  },
}

export default plugin
