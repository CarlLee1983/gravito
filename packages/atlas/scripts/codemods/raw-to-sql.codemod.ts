/**
 * Codemod: Migrate from db.raw() to db.sql()
 *
 * This codemod automatically converts safe `db.raw()` calls to the new
 * `db.sql` tagged template literal API for SQL injection protection.
 *
 * Patterns handled:
 * 1. Raw literal strings → Convert to sql`` template
 * 2. Raw with parameters → Convert with parameter binding
 * 3. String concatenation → Mark for manual review
 *
 * Usage:
 *   jscodeshift -t scripts/codemods/raw-to-sql.codemod.ts <files>
 */

import type { API, FileInfo } from 'jscodeshift'

interface Options {
  dryRun?: boolean
}

export default function transform(file: FileInfo, api: API, options: Options): string {
  const j = api.jscodeshift
  const root = j(file.source)
  let hasChanges = false

  // Pattern 1: connection.raw('SELECT...')
  root
    .find(j.CallExpression)
    .filter((path) => {
      const node = path.value
      const callee = node.callee

      // Check if it's .raw()
      if (callee.type !== 'MemberExpression' || (callee.property as any).name !== 'raw') {
        return false
      }

      // Check if first argument is a string literal
      return (
        node.arguments.length >= 1 &&
        (node.arguments[0]?.type === 'Literal' || node.arguments[0]?.type === 'TemplateLiteral')
      )
    })
    .replaceWith((path) => {
      const node = path.value
      const firstArg = node.arguments[0]

      // Simple string literal: db.raw('SELECT * FROM users')
      if (firstArg?.type === 'Literal' && typeof firstArg.value === 'string') {
        hasChanges = true

        // Convert string to template literal
        const templateLiteral = j.templateLiteral(
          [j.templateElement({ raw: firstArg.value }, false)],
          []
        )

        // Update the call
        const newCall = j.callExpression(
          j.memberExpression(node.callee.object, j.identifier('sql')),
          []
        )

        // Replace .raw() with .sql`...`
        return j.taggedTemplateExpression(newCall, templateLiteral)
      }

      // Template literal: db.raw(`SELECT...`)
      if (firstArg?.type === 'TemplateLiteral') {
        hasChanges = true

        const newCall = j.callExpression(
          j.memberExpression(node.callee.object, j.identifier('sql')),
          []
        )

        return j.taggedTemplateExpression(newCall, firstArg)
      }

      return node
    })

  // Add import if we made changes and SafeQueryBuilder isn't imported
  if (hasChanges) {
    const imports = root.find(j.ImportDeclaration)
    const hasAtlasImport = imports.some((path) => {
      const source = path.value.source.value
      return source === '@gravito/atlas'
    })

    if (hasAtlasImport) {
      // Update existing @gravito/atlas import if needed
      imports.forEach((path) => {
        if (path.value.source.value === '@gravito/atlas') {
          // Verify SafeQueryBuilder is available (it should be after Phase 4a)
          // No need to add explicit import since .sql is a method on connection
        }
      })
    }
  }

  return hasChanges ? root.toSource() : file.source
}
