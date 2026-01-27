#!/usr/bin/env bun
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface FileCoverage {
  file: string
  linesFound: number
  linesHit: number
  functionsFound: number
  functionsHit: number
}

function parseLcov(lcovPath: string): FileCoverage[] {
  const content = readFileSync(lcovPath, 'utf-8')
  const files: FileCoverage[] = []
  let currentFile: Partial<FileCoverage> = {}

  for (const line of content.split('\n')) {
    if (line.startsWith('SF:')) {
      currentFile = { file: line.substring(3) }
    } else if (line.startsWith('LF:')) {
      currentFile.linesFound = Number.parseInt(line.substring(3))
    } else if (line.startsWith('LH:')) {
      currentFile.linesHit = Number.parseInt(line.substring(3))
    } else if (line.startsWith('FNF:')) {
      currentFile.functionsFound = Number.parseInt(line.substring(4))
    } else if (line.startsWith('FNH:')) {
      currentFile.functionsHit = Number.parseInt(line.substring(4))
    } else if (line === 'end_of_record' && currentFile.file) {
      files.push(currentFile as FileCoverage)
      currentFile = {}
    }
  }

  return files
}

function calculateCoverage(files: FileCoverage[]) {
  const totalLines = files.reduce((sum, f) => sum + f.linesFound, 0)
  const coveredLines = files.reduce((sum, f) => sum + f.linesHit, 0)
  const totalFuncs = files.reduce((sum, f) => sum + f.functionsFound, 0)
  const coveredFuncs = files.reduce((sum, f) => sum + f.functionsHit, 0)

  return {
    linePercent: ((coveredLines / totalLines) * 100).toFixed(2),
    funcPercent: ((coveredFuncs / totalFuncs) * 100).toFixed(2),
    totalLines,
    coveredLines,
    totalFuncs,
    coveredFuncs,
  }
}

const lcovPath = join(import.meta.dir, '../coverage/lcov.info')
const allFiles = parseLcov(lcovPath)

const graphqlFiles = allFiles.filter((f) => f.file.startsWith('src/'))

console.log('\n📊 Coverage Report for @gravito/graphql\n')
console.log('File                 | % Funcs | % Lines | Uncovered')
console.log('---------------------|---------|---------|----------')

for (const file of graphqlFiles) {
  const funcPercent = ((file.functionsHit / file.functionsFound) * 100).toFixed(2)
  const linePercent = ((file.linesHit / file.linesFound) * 100).toFixed(2)
  const uncovered = file.linesFound - file.linesHit

  console.log(
    `${file.file.padEnd(20)} | ${funcPercent.padStart(7)} | ${linePercent.padStart(7)} | ${uncovered}`
  )
}

console.log('---------------------|---------|---------|----------')

const summary = calculateCoverage(graphqlFiles)
console.log(
  `${'All files'.padEnd(20)} | ${summary.funcPercent.padStart(7)} | ${summary.linePercent.padStart(7)} |`
)

console.log(`\n✅ Total: ${summary.coveredLines}/${summary.totalLines} lines covered`)
console.log(`✅ Total: ${summary.coveredFuncs}/${summary.totalFuncs} functions covered\n`)

if (Number.parseFloat(summary.linePercent) < 80) {
  console.error('❌ Coverage below 80% threshold')
  process.exit(1)
}

console.log('✅ Coverage meets 80% threshold')
