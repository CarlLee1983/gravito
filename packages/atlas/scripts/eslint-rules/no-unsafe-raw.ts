/**
 * ESLint Rule: no-unsafe-raw
 *
 * Detects potentially unsafe db.raw() usage patterns and suggests migration to db.sql.
 *
 * ❌ Bad:
 *   const user = await db.raw(`SELECT * FROM users WHERE id = ${id}`)
 *   const query = `SELECT * FROM users WHERE id = ${id}`
 *   await db.raw(query)
 *
 * ✅ Good:
 *   const user = await db.sql`SELECT * FROM users WHERE id = ${id}`.first()
 *   const user = await db.raw('SELECT * FROM users WHERE id = ?', [id])
 */

import type { Rule } from 'eslint'
import type { Node } from 'estree'

interface CallExpressionNode extends Node {
  type: 'CallExpression'
  callee: any
  arguments: any[]
}

interface TemplateLiteralNode extends Node {
  type: 'TemplateLiteral'
  expressions: any[]
  quasis: any[]
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detect unsafe db.raw() usage and suggest db.sql migration',
      category: 'Security',
      recommended: true,
      url: 'https://gravito.dev/docs/atlas/safe-queries',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          allowLiterals: {
            type: 'boolean',
            default: true,
            description: 'Allow raw SQL literals without parameters',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    const options = context.options[0] || {}
    const allowLiterals = options.allowLiterals !== false

    return {
      CallExpression(node: CallExpressionNode) {
        const callee = node.callee

        // Check if this is .raw()
        if (callee.type !== 'MemberExpression' || callee.property?.name !== 'raw') {
          return
        }

        // Check if it's called on db or connection object
        const objectName = callee.object?.name || callee.object?.object?.name
        if (!['db', 'DB', 'connection', 'conn'].includes(objectName)) {
          return
        }

        const firstArg = node.arguments[0]

        // Pattern 1: Template literal with expressions (UNSAFE)
        if (firstArg?.type === 'TemplateLiteral') {
          const templateLit = firstArg as TemplateLiteralNode
          if (templateLit.expressions?.length > 0) {
            context.report({
              node,
              message:
                'Unsafe: db.raw() with template expressions vulnerable to SQL injection. ' +
                'Use db.sql`...` with tagged templates instead.',
              fix(fixer) {
                const sourceCode = context.sourceCode
                const fullText = sourceCode.getText(node)

                // Simple fix: suggest the migration
                return fixer.replaceText(
                  node,
                  fullText.replace(/\.raw\s*\(/g, '.sql`').replace(/\)$/, '`')
                )
              },
            })
            return
          }
        }

        // Pattern 2: String variable (no bindings provided) - UNSAFE if used for concatenation
        if (firstArg?.type === 'Identifier') {
          context.report({
            node,
            message:
              'Warning: db.raw() called with a variable without parameter bindings. ' +
              'If this variable contains user input, it may be vulnerable to SQL injection. ' +
              'Consider using db.sql`...` with tagged templates instead.',
          })
          return
        }

        // Pattern 3: String concatenation - UNSAFE
        if (firstArg?.type === 'BinaryExpression') {
          context.report({
            node,
            message:
              'Unsafe: db.raw() called with string concatenation. ' +
              'This pattern is vulnerable to SQL injection. ' +
              'Use db.sql`...` with tagged templates instead.',
          })
          return
        }

        // Pattern 4: String literal without bindings (allowed if option enabled)
        if (firstArg?.type === 'Literal' && typeof firstArg.value === 'string') {
          if (!allowLiterals && node.arguments.length === 1) {
            context.report({
              node,
              message:
                'Consider using db.sql`...` for static SQL queries. ' +
                'It provides better readability and preparation.',
              fix(fixer) {
                const sourceCode = context.sourceCode
                const fullText = sourceCode.getText(node)
                return fixer.replaceText(
                  node,
                  fullText.replace(/\.raw\s*\(\s*['"`]/g, '.sql`').replace(/['"`]\s*\)$/, '`')
                )
              },
            })
          }
        }
      },
    }
  },
}

export default rule
