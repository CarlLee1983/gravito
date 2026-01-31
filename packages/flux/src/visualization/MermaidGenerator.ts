import type { StepExecution, WorkflowDefinition, WorkflowState } from '../types'

/**
 * Options for customizing Mermaid diagram generation.
 */
export interface MermaidOptions {
  /** Include detailed step information (retries, timeout, conditions). */
  showDetails?: boolean
  /** Include execution history with status colors. */
  showStatus?: boolean
  /** Render parallel groups visually. */
  showParallelGroups?: boolean
  /** Theme: 'default' | 'dark' | 'forest' | 'neutral'. */
  theme?: 'default' | 'dark' | 'forest' | 'neutral'
}

/**
 * Generates Mermaid flowchart diagrams from workflow definitions and execution states.
 *
 * **Features**:
 * - Workflow structure visualization (steps, parallel groups, conditions)
 * - Execution status overlay (completed, failed, compensated)
 * - Detailed metadata (retries, timeout, commit markers)
 *
 * **Use Cases**:
 * - Documentation generation
 * - Debugging workflow execution
 * - Visual workflow design validation
 */
export class MermaidGenerator {
  /**
   * Generates a Mermaid flowchart from a workflow definition.
   *
   * @param definition - The workflow definition to visualize
   * @param options - Customization options
   * @returns Mermaid diagram syntax as a string
   *
   * @example
   * ```typescript
   * const generator = new MermaidGenerator()
   * const diagram = generator.generateFromDefinition(workflow, {
   *   showDetails: true,
   *   showParallelGroups: true
   * })
   * console.log(diagram)
   * ```
   */
  generateFromDefinition<TInput, TData>(
    definition: WorkflowDefinition<TInput, TData>,
    options: MermaidOptions = {}
  ): string {
    const { showDetails = false, showParallelGroups = true, theme = 'default' } = options

    const lines: string[] = []
    lines.push(`%%{init: {'theme':'${theme}'}}%%`)
    lines.push('flowchart TD')
    lines.push(`  Start([Start: ${definition.name}])`)

    let prevNode = 'Start'
    const parallelGroups = new Map<string, string[]>()

    // First pass: identify parallel groups
    if (showParallelGroups) {
      for (const step of definition.steps) {
        if (step.parallelGroup) {
          const group = parallelGroups.get(step.parallelGroup) || []
          group.push(step.name)
          parallelGroups.set(step.parallelGroup, group)
        }
      }
    }

    const processedGroups = new Set<string>()

    for (let i = 0; i < definition.steps.length; i++) {
      const step = definition.steps[i]!

      // Handle parallel groups
      if (step.parallelGroup && showParallelGroups) {
        if (processedGroups.has(step.parallelGroup)) {
          continue // Already processed this group
        }
        processedGroups.add(step.parallelGroup)

        const groupSteps = parallelGroups.get(step.parallelGroup)!
        const groupName = `ParallelGroup_${step.parallelGroup}`

        // Create subgraph for parallel execution
        lines.push(`  subgraph ${groupName}[" "]`)
        lines.push(`    direction LR`)

        for (const stepName of groupSteps) {
          const s = definition.steps.find((st) => st.name === stepName)!
          const nodeId = this.sanitizeNodeId(stepName)
          const label = this.buildStepLabel(s, showDetails)
          const shape = s.commit ? `[${label}]` : `(${label})`
          lines.push(`    ${nodeId}${shape}`)

          if (s.compensate) {
            lines.push(`    ${nodeId}_comp[🔄 Compensate]`)
            lines.push(`    ${nodeId} -.->|on failure| ${nodeId}_comp`)
          }
        }

        lines.push(`  end`)
        lines.push(`  ${prevNode} --> ${groupName}`)
        prevNode = groupName
      } else if (!step.parallelGroup) {
        // Regular sequential step
        const nodeId = this.sanitizeNodeId(step.name)
        const label = this.buildStepLabel(step, showDetails)
        const shape = step.commit ? `[${label}]` : `(${label})`

        lines.push(`  ${nodeId}${shape}`)

        // Handle conditional steps
        if (step.when) {
          const condId = `${nodeId}_cond`
          lines.push(`  ${condId}{Condition?}`)
          lines.push(`  ${prevNode} --> ${condId}`)
          lines.push(`  ${condId} -->|yes| ${nodeId}`)
          lines.push(`  ${condId} -->|no| ${this.getNextNodeId(definition.steps, i)}`)
          prevNode = nodeId
        } else {
          lines.push(`  ${prevNode} --> ${nodeId}`)
          prevNode = nodeId
        }

        // Show compensation
        if (step.compensate) {
          lines.push(`  ${nodeId}_comp[🔄 Compensate]`)
          lines.push(`  ${nodeId} -.->|on failure| ${nodeId}_comp`)
        }
      }
    }

    lines.push(`  ${prevNode} --> End([End])`)

    // Add styling
    lines.push('')
    lines.push('  classDef commitStep fill:#e1f5e1,stroke:#4caf50,stroke-width:2px')
    lines.push('  classDef normalStep fill:#e3f2fd,stroke:#2196f3,stroke-width:2px')
    lines.push(
      '  classDef compensateStep fill:#fff3e0,stroke:#ff9800,stroke-width:1px,stroke-dasharray: 5 5'
    )

    return lines.join('\n')
  }

  /**
   * Generates a Mermaid flowchart from a workflow execution state.
   * Overlays execution status (completed, failed, compensated) on top of the structure.
   *
   * @param definition - The workflow definition
   * @param state - The current execution state
   * @param options - Customization options
   * @returns Mermaid diagram syntax with status overlay
   *
   * @example
   * ```typescript
   * const diagram = generator.generateFromState(workflow, executionState, {
   *   showStatus: true,
   *   showDetails: true
   * })
   * ```
   */
  generateFromState<TInput, TData>(
    definition: WorkflowDefinition<TInput, TData>,
    state: WorkflowState<TInput, TData>,
    options: MermaidOptions = {}
  ): string {
    const {
      showDetails = true,
      showStatus = true,
      showParallelGroups = true,
      theme = 'default',
    } = options

    const lines: string[] = []
    lines.push(`%%{init: {'theme':'${theme}'}}%%`)
    lines.push('flowchart TD')
    lines.push(`  Start([Start: ${definition.name}])`)
    lines.push(`  Start:::started`)

    let prevNode = 'Start'
    const parallelGroups = new Map<string, string[]>()
    const executionMap = new Map<string, StepExecution>()

    // Build execution map
    for (const exec of state.history) {
      executionMap.set(exec.name, exec)
    }

    // Identify parallel groups
    if (showParallelGroups) {
      for (const step of definition.steps) {
        if (step.parallelGroup) {
          const group = parallelGroups.get(step.parallelGroup) || []
          group.push(step.name)
          parallelGroups.set(step.parallelGroup, group)
        }
      }
    }

    const processedGroups = new Set<string>()

    for (let i = 0; i < definition.steps.length; i++) {
      const step = definition.steps[i]!

      // Handle parallel groups
      if (step.parallelGroup && showParallelGroups) {
        if (processedGroups.has(step.parallelGroup)) {
          continue
        }
        processedGroups.add(step.parallelGroup)

        const groupSteps = parallelGroups.get(step.parallelGroup)!
        const groupName = `ParallelGroup_${step.parallelGroup}`

        lines.push(`  subgraph ${groupName}[" "]`)
        lines.push(`    direction LR`)

        for (const stepName of groupSteps) {
          const s = definition.steps.find((st) => st.name === stepName)!
          const nodeId = this.sanitizeNodeId(stepName)
          const exec = executionMap.get(stepName)
          const label = this.buildStepLabelWithStatus(s, exec, showDetails, showStatus)
          const shape = s.commit ? `[${label}]` : `(${label})`

          lines.push(`    ${nodeId}${shape}`)

          if (exec && showStatus) {
            const statusClass = this.getStatusClass(exec.status)
            lines.push(`    ${nodeId}:::${statusClass}`)
          }

          if (s.compensate && exec?.status === 'compensated') {
            lines.push(`    ${nodeId}_comp[🔄 Compensated]`)
            lines.push(`    ${nodeId}_comp:::compensated`)
            lines.push(`    ${nodeId} -.->|rolled back| ${nodeId}_comp`)
          }
        }

        lines.push(`  end`)
        lines.push(`  ${prevNode} --> ${groupName}`)
        prevNode = groupName
      } else if (!step.parallelGroup) {
        const nodeId = this.sanitizeNodeId(step.name)
        const exec = executionMap.get(step.name)
        const label = this.buildStepLabelWithStatus(step, exec, showDetails, showStatus)
        const shape = step.commit ? `[${label}]` : `(${label})`

        lines.push(`  ${nodeId}${shape}`)

        if (exec && showStatus) {
          const statusClass = this.getStatusClass(exec.status)
          lines.push(`  ${nodeId}:::${statusClass}`)
        }

        if (step.when) {
          const condId = `${nodeId}_cond`
          const skipped = exec?.status === 'skipped'
          lines.push(`  ${condId}{Condition?}`)
          lines.push(`  ${prevNode} --> ${condId}`)

          if (skipped) {
            lines.push(`  ${condId}:::skipped`)
            lines.push(`  ${condId} -->|no| ${nodeId}`)
          } else {
            lines.push(`  ${condId} -->|yes| ${nodeId}`)
          }
        } else {
          lines.push(`  ${prevNode} --> ${nodeId}`)
        }

        if (step.compensate && exec?.status === 'compensated') {
          lines.push(`  ${nodeId}_comp[🔄 Compensated]`)
          lines.push(`  ${nodeId}_comp:::compensated`)
          lines.push(`  ${nodeId} -.->|rolled back| ${nodeId}_comp`)
        }

        prevNode = nodeId
      }
    }

    const finalStatus = this.getWorkflowFinalStatus(state.status)
    lines.push(`  ${prevNode} --> End([End: ${finalStatus}])`)
    lines.push(`  End:::${this.getStatusClass(state.status)}`)

    // Add status-based styling
    lines.push('')
    lines.push('  classDef started fill:#e3f2fd,stroke:#2196f3,stroke-width:2px')
    lines.push('  classDef completed fill:#e8f5e9,stroke:#4caf50,stroke-width:2px')
    lines.push('  classDef failed fill:#ffebee,stroke:#f44336,stroke-width:2px')
    lines.push('  classDef compensated fill:#fff3e0,stroke:#ff9800,stroke-width:2px')
    lines.push(
      '  classDef skipped fill:#f5f5f5,stroke:#9e9e9e,stroke-width:1px,stroke-dasharray: 5 5'
    )
    lines.push('  classDef pending fill:#fafafa,stroke:#bdbdbd,stroke-width:1px')
    lines.push(
      '  classDef suspended fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px,stroke-dasharray: 3 3'
    )

    return lines.join('\n')
  }

  private sanitizeNodeId(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_')
  }

  private buildStepLabel(step: any, showDetails: boolean): string {
    let label = step.name

    if (showDetails) {
      const meta: string[] = []
      if (step.commit) {
        meta.push('📝')
      }
      if (step.retries && step.retries > 0) {
        meta.push(`↻${step.retries}`)
      }
      if (step.timeout) {
        meta.push(`⏱${step.timeout}ms`)
      }
      if (step.when) {
        meta.push('❓')
      }

      if (meta.length > 0) {
        label += `<br/><small>${meta.join(' ')}</small>`
      }
    }

    return label
  }

  private buildStepLabelWithStatus(
    step: any,
    exec: StepExecution | undefined,
    showDetails: boolean,
    showStatus: boolean
  ): string {
    let label = step.name

    if (showStatus && exec) {
      label += `<br/><small><b>${exec.status.toUpperCase()}</b></small>`

      if (exec.duration) {
        label += `<br/><small>${exec.duration}ms</small>`
      }

      if (exec.retries > 0) {
        label += `<br/><small>Retries: ${exec.retries}</small>`
      }
    } else if (showDetails) {
      const meta: string[] = []
      if (step.commit) {
        meta.push('📝')
      }
      if (step.retries && step.retries > 0) {
        meta.push(`↻${step.retries}`)
      }
      if (step.timeout) {
        meta.push(`⏱${step.timeout}ms`)
      }
      if (step.when) {
        meta.push('❓')
      }

      if (meta.length > 0) {
        label += `<br/><small>${meta.join(' ')}</small>`
      }
    }

    return label
  }

  private getStatusClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'completed'
      case 'failed':
        return 'failed'
      case 'compensated':
      case 'compensating':
        return 'compensated'
      case 'skipped':
        return 'skipped'
      case 'suspended':
        return 'suspended'
      case 'running':
        return 'started'
      default:
        return 'pending'
    }
  }

  private getWorkflowFinalStatus(status: string): string {
    switch (status) {
      case 'completed':
        return '✅ Completed'
      case 'failed':
        return '❌ Failed'
      case 'rolled_back':
        return '🔄 Rolled Back'
      case 'suspended':
        return '⏸ Suspended'
      default:
        return status
    }
  }

  private getNextNodeId(steps: any[], currentIndex: number): string {
    const nextStep = steps[currentIndex + 1]
    return nextStep ? this.sanitizeNodeId(nextStep.name) : 'End'
  }
}
