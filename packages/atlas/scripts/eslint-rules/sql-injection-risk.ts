/**
 * ESLint Rule: sql-injection-risk
 *
 * Detects potential SQL injection vulnerabilities by identifying:
 * 1. String concatenation in SQL queries
 * 2. Template literals with direct variable interpolation
 * 3. Missing use of identifier() for table/column names
 *
 * ❌ Bad:
 *   const query = `SELECT * FROM ${table} WHERE id = ${id}`
 *   await db.raw(query)
 *
 * ✅ Good:
 *   const query = await db.sql`SELECT * FROM ${identifier(table)} WHERE id = ${id}`.all()
 */

import type { Rule } from 'eslint'
import type { Node } from 'estree'

interface TemplateLiteralNode extends Node {
  type: 'TemplateLiteral'
  expressions: any[]
}

interface MemberExpressionNode extends Node {
  type: 'MemberExpression'
  object: any
  property: any
}

const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'INSERT',
  'UPDATE',
  'DELETE',
  'JOIN',
  'UNION',
  'DROP',
  'TABLE',
]

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect potential SQL injection vulnerabilities',
      category: 'Security',
      recommended: true,
      url: 'https://gravito.dev/docs/atlas/safe-queries',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowIdentifierInQueries: {
            type: 'boolean',
            default: true,
            description: 'Allow variables in queries only if wrapped with identifier()',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    const sourceCode = context.sourceCode

    return {
      TemplateLiteral(node: TemplateLiteralNode) {
        // Check if this template is used in a SQL context
        const parent = node.parent as any

        if (!parent) return

        // Check if parent is a tag expression with 'sql' tag
        if (parent.type === 'TaggedTemplateExpression') {
          const tag = parent.tag as MemberExpressionNode
          if (tag.type === 'MemberExpression' && tag.property?.name === 'sql') {
            // This is using db.sql, which is safe
            return
          }
        }

        // Check if parent is a call to db.raw() or similar
        if (parent.type === 'CallExpression' && parent.callee?.property?.name === 'raw') {
          // Check for expressions in the template
          if (node.expressions && node.expressions.length > 0) {
            const quasi = node.quasis[0]?.value?.raw || ''

            // Check if this looks like SQL
            const isSQLLike = SQL_KEYWORDS.some((keyword) => quasi.toUpperCase().includes(keyword))

            if (isSQLLike) {
              node.expressions.forEach((expr, index) => {
                const exprText = sourceCode.getText(expr)

                // Warn about direct variable interpolation in table/column positions
                const beforeExpr = node.quasis[index]?.value?.raw || ''
                const isTableOrColumnContext = /FROM\s+$|JOIN\s+$|INTO\s+$|\.\s*$/.test(beforeExpr)

                if (isTableOrColumnContext && !exprText.includes('identifier(')) {
                  context.report({
                    node: expr,
                    message:
                      'Potential SQL injection: Dynamic table/column name detected. ' +
                      'Use identifier() to validate identifiers before interpolation.',
                    fix(fixer) {
                      return fixer.replaceText(expr, `identifier(${exprText})`)
                    },
                  })
                }

                // Warn about any variable in WHERE clause without parameter binding
                const beforeWhere = node.quasis[index]?.value?.raw || ''
                const isInWhere = /WHERE.*$/.test(beforeWhere)

                if (isInWhere && parent.parent?.type !== 'TaggedTemplateExpression') {
                  context.report({
                    node: expr,
                    message:
                      'Potential SQL injection: Parameter used in WHERE clause outside of db.sql. ' +
                      'Use db.sql`...` for automatic parameter binding, or db.raw(sql, [params]).',
                  })
                }
              })
            }
          }
        }
      },

      BinaryExpression(node: any) {
        // Detect string concatenation that looks like SQL
        if (node.operator !== '+') return

        const leftText = sourceCode.getText(node.left).toUpperCase()
        const rightText = sourceCode.getText(node.right).toUpperCase()

        // Check if concatenating SQL
        const isSQLConcat =
          SQL_KEYWORDS.some(
            (kw) =>
              leftText.includes(kw) ||
              rightText.includes(kw) ||
              /SELECT|INSERT|UPDATE|DELETE/.test(leftText + rightText)
          ) || /WHERE|FROM|JOIN/.test(leftText + rightText)

        if (isSQLConcat) {
          context.report({
            node,
            message:
              'Unsafe: SQL queries should not be constructed with string concatenation. ' +
              'Use db.sql`...` with tagged templates instead.',
          })
        }
      },
    }
  },
}

export default rule
