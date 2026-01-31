#!/usr/bin/env bun

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import type { WorkflowDefinition, WorkflowState } from '../types'
import { MermaidGenerator } from '../visualization/MermaidGenerator'

const HELP_TEXT = `
@gravito/flux - Workflow Visualization CLI

USAGE:
  flux-visualize [OPTIONS]

OPTIONS:
  --definition <path>   Path to workflow definition JSON file
  --state <path>        Path to workflow state JSON file (optional)
  --theme <name>        Mermaid theme: default, dark, forest, neutral (default: default)
  --details             Show detailed step metadata (retries, timeout, etc.)
  --no-parallel-groups  Disable parallel group visualization
  --output <path>       Output file path (default: stdout)
  --help, -h            Show this help message

EXAMPLES:
  # Visualize workflow definition
  flux-visualize --definition ./workflow.json

  # Visualize workflow with execution state
  flux-visualize --definition ./workflow.json --state ./state.json

  # Generate dark theme diagram with details
  flux-visualize --definition ./workflow.json --theme dark --details

  # Save to file
  flux-visualize --definition ./workflow.json --output diagram.mmd

NOTES:
  - Definition file should export a WorkflowDefinition object as JSON
  - State file should export a WorkflowState object as JSON
  - Generated diagrams use Mermaid syntax and can be rendered at https://mermaid.live
`

interface CliOptions {
  definition?: string
  state?: string
  theme?: 'default' | 'dark' | 'forest' | 'neutral'
  details?: boolean
  'no-parallel-groups'?: boolean
  output?: string
  help?: boolean
}

async function main() {
  try {
    const { values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        definition: { type: 'string' },
        state: { type: 'string' },
        theme: { type: 'string' },
        details: { type: 'boolean', default: false },
        'no-parallel-groups': { type: 'boolean', default: false },
        output: { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
      },
    })

    const options = values as CliOptions

    if (options.help || !options.definition) {
      console.log(HELP_TEXT)
      process.exit(options.help ? 0 : 1)
    }

    const definitionPath = resolve(options.definition)
    if (!existsSync(definitionPath)) {
      console.error(`Error: Definition file not found: ${definitionPath}`)
      process.exit(1)
    }

    const definitionJson = readFileSync(definitionPath, 'utf-8')
    const definition: WorkflowDefinition = JSON.parse(definitionJson)

    let state: WorkflowState | undefined
    if (options.state) {
      const statePath = resolve(options.state)
      if (!existsSync(statePath)) {
        console.error(`Error: State file not found: ${statePath}`)
        process.exit(1)
      }
      const stateJson = readFileSync(statePath, 'utf-8')
      state = JSON.parse(stateJson)
    }

    const generator = new MermaidGenerator()
    const diagram = state
      ? generator.generateFromState(definition, state, {
          theme: options.theme || 'default',
          showDetails: options.details,
          showStatus: true,
          showParallelGroups: !options['no-parallel-groups'],
        })
      : generator.generateFromDefinition(definition, {
          theme: options.theme || 'default',
          showDetails: options.details,
          showParallelGroups: !options['no-parallel-groups'],
        })

    if (options.output) {
      const { writeFileSync } = await import('node:fs')
      const outputPath = resolve(options.output)
      writeFileSync(outputPath, diagram, 'utf-8')
      console.log(`✅ Diagram saved to: ${outputPath}`)
      console.log(`\n📊 View at: https://mermaid.live`)
    } else {
      console.log(diagram)
      console.log(`\n📊 Copy the output above to: https://mermaid.live`)
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
