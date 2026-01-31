import { describe, expect, it } from 'bun:test'
import { createWorkflow } from '../src/builder/WorkflowBuilder'
import type { WorkflowState } from '../src/types'
import { MermaidGenerator } from '../src/visualization/MermaidGenerator'

describe('MermaidGenerator', () => {
  const generator = new MermaidGenerator()

  describe('generateFromDefinition', () => {
    it('should generate basic flowchart for simple workflow', () => {
      const workflow = createWorkflow('order-process')
        .input<{ orderId: string }>()
        .step('validate', async (ctx) => {
          ctx.data.order = { id: ctx.input.orderId }
        })
        .step('process', async (ctx) => {
          ctx.data.processed = true
        })
        .commit('notify', async (ctx) => {
          ctx.data.notified = true
        })
        .build()

      const diagram = generator.generateFromDefinition(workflow)

      expect(diagram).toContain('flowchart TD')
      expect(diagram).toContain('Start([Start: order-process])')
      expect(diagram).toContain('validate')
      expect(diagram).toContain('process')
      expect(diagram).toContain('notify')
      expect(diagram).toContain('End([End])')
    })

    it('should show commit steps with different shape', () => {
      const workflow = createWorkflow('test')
        .input<{}>()
        .step('normal', async () => {})
        .commit('commit-step', async () => {})
        .build()

      const diagram = generator.generateFromDefinition(workflow)

      expect(diagram).toContain('normal(')
      expect(diagram).toContain('commit_step[')
    })

    it('should show parallel groups in subgraph', () => {
      const workflow = createWorkflow('travel-booking')
        .input<{}>()
        .stepParallel([
          {
            name: 'book-flight',
            handler: async (ctx) => {
              ctx.data.flight = 'booked'
            },
          },
          {
            name: 'book-hotel',
            handler: async (ctx) => {
              ctx.data.hotel = 'booked'
            },
          },
        ])
        .build()

      const diagram = generator.generateFromDefinition(workflow, {
        showParallelGroups: true,
      })

      expect(diagram).toContain('subgraph ParallelGroup_parallel')
      expect(diagram).toContain('book_flight')
      expect(diagram).toContain('book_hotel')
      expect(diagram).toContain('direction LR')
    })

    it('should support different themes', () => {
      const workflow = createWorkflow('test')
        .input<{}>()
        .step('test', async () => {})
        .build()

      const darkDiagram = generator.generateFromDefinition(workflow, { theme: 'dark' })
      const forestDiagram = generator.generateFromDefinition(workflow, { theme: 'forest' })

      expect(darkDiagram).toContain("%%{init: {'theme':'dark'}}%%")
      expect(forestDiagram).toContain("%%{init: {'theme':'forest'}}%%")
    })
  })

  describe('generateFromState', () => {
    it('should show execution status on steps', () => {
      const workflow = createWorkflow('test')
        .input<{}>()
        .step('step1', async () => {})
        .step('step2', async () => {})
        .step('step3', async () => {})
        .build()

      const state: WorkflowState = {
        id: 'wf-123',
        name: 'test',
        status: 'completed',
        input: {},
        data: {},
        currentStep: 3,
        history: [
          {
            name: 'step1',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            duration: 100,
            retries: 0,
          },
          {
            name: 'step2',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            duration: 150,
            retries: 0,
          },
          {
            name: 'step3',
            status: 'failed',
            startedAt: new Date(),
            error: 'Test error',
            retries: 0,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }

      const diagram = generator.generateFromState(workflow, state, {
        showStatus: true,
      })

      expect(diagram).toContain('COMPLETED')
      expect(diagram).toContain('FAILED')
      expect(diagram).toContain('100ms')
      expect(diagram).toContain('150ms')
      expect(diagram).toContain('step1:::completed')
      expect(diagram).toContain('step2:::completed')
      expect(diagram).toContain('step3:::failed')
    })

    it('should show final workflow status in End node', () => {
      const workflow = createWorkflow('test')
        .input<{}>()
        .step('step1', async () => {})
        .build()

      const completedState: WorkflowState = {
        id: 'wf-1',
        name: 'test',
        status: 'completed',
        input: {},
        data: {},
        currentStep: 1,
        history: [
          {
            name: 'step1',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            retries: 0,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }

      const failedState: WorkflowState = {
        ...completedState,
        id: 'wf-2',
        status: 'failed',
      }

      const rolledBackState: WorkflowState = {
        ...completedState,
        id: 'wf-3',
        status: 'rolled_back',
      }

      const completedDiagram = generator.generateFromState(workflow, completedState)
      const failedDiagram = generator.generateFromState(workflow, failedState)
      const rolledBackDiagram = generator.generateFromState(workflow, rolledBackState)

      expect(completedDiagram).toContain('End([End: ✅ Completed])')
      expect(failedDiagram).toContain('End([End: ❌ Failed])')
      expect(rolledBackDiagram).toContain('End([End: 🔄 Rolled Back])')
    })
  })

  describe('edge cases', () => {
    it('should handle workflow with special characters in step names', () => {
      const workflow = createWorkflow('test')
        .input<{}>()
        .step('step-with-dashes', async () => {})
        .step('step.with.dots', async () => {})
        .step('step@with@at', async () => {})
        .build()

      const diagram = generator.generateFromDefinition(workflow)

      expect(diagram).toContain('step_with_dashes')
      expect(diagram).toContain('step_with_dots')
      expect(diagram).toContain('step_with_at')
    })

    it('should show compensation steps', () => {
      const workflow = createWorkflow('saga-test')
        .input<{}>()
        .step(
          'reserve',
          async (ctx) => {
            ctx.data.reserved = true
          },
          {
            compensate: async (ctx) => {
              ctx.data.reserved = false
            },
          }
        )
        .build()

      const diagram = generator.generateFromDefinition(workflow, { showDetails: true })

      expect(diagram).toContain('reserve_comp[🔄 Compensate]')
      expect(diagram).toContain('reserve -.->|on failure| reserve_comp')
    })

    it('should show conditional steps', () => {
      const workflow = createWorkflow('conditional-test')
        .input<{}>()
        .step(
          'optional-step',
          async (ctx) => {
            ctx.data.ran = true
          },
          {
            when: (ctx) => ctx.data.shouldRun === true,
          }
        )
        .build()

      const diagram = generator.generateFromDefinition(workflow, { showDetails: true })

      expect(diagram).toContain('optional_step')
      expect(diagram).toContain('condition')
    })

    it('should show step details (retries, timeout)', () => {
      const workflow = createWorkflow('detailed-test')
        .input<{}>()
        .step(
          'retry-step',
          async (ctx) => {
            ctx.data.done = true
          },
          { retries: 5, timeout: 30000 }
        )
        .build()

      const diagram = generator.generateFromDefinition(workflow, { showDetails: true })

      expect(diagram).toContain('retry-step')
      expect(diagram).toContain('↻5')
      expect(diagram).toContain('⏱30000ms')
    })

    it('should apply theme classes', () => {
      const workflow = createWorkflow('theme-test')
        .input<{}>()
        .step('step1', async () => {})
        .build()

      const state: WorkflowState = {
        id: 'wf-123',
        name: 'theme-test',
        status: 'completed',
        input: {},
        data: {},
        currentStep: 1,
        history: [
          {
            name: 'step1',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            retries: 0,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }

      const diagram = generator.generateFromState(workflow, state, {
        showStatus: true,
        theme: 'dark',
      })

      expect(diagram).toContain("%%{init: {'theme':'dark'}}%%")
      expect(diagram).toContain('classDef completed')
      expect(diagram).toContain('classDef failed')
    })

    it('should show suspended step status', () => {
      const workflow = createWorkflow('suspend-test')
        .input<{}>()
        .step('wait-approval', async () => {})
        .build()

      const state: WorkflowState = {
        id: 'wf-suspend',
        name: 'suspend-test',
        status: 'suspended',
        input: {},
        data: {},
        currentStep: 0,
        history: [
          {
            name: 'wait-approval',
            status: 'suspended',
            startedAt: new Date(),
            suspendedAt: new Date(),
            waitingFor: 'manager-approval',
            retries: 0,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }

      const diagram = generator.generateFromState(workflow, state, { showStatus: true })

      expect(diagram).toContain('SUSPENDED')
      expect(diagram).toContain('wait_approval:::suspended')
    })

    it('should show compensated step status', () => {
      const workflow = createWorkflow('compensate-test')
        .input<{}>()
        .step('failing-step', async () => {})
        .build()

      const state: WorkflowState = {
        id: 'wf-comp',
        name: 'compensate-test',
        status: 'rolled_back',
        input: {},
        data: {},
        currentStep: 0,
        history: [
          {
            name: 'failing-step',
            status: 'compensated',
            startedAt: new Date(),
            compensatedAt: new Date(),
            retries: 0,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }

      const diagram = generator.generateFromState(workflow, state, { showStatus: true })

      expect(diagram).toContain('COMPENSATED')
      expect(diagram).toContain('failing_step:::compensated')
    })

    it('should show parallel steps with execution status', () => {
      const workflow = createWorkflow('parallel-status-test')
        .input<{}>()
        .stepParallel([
          { name: 'task1', handler: async () => {} },
          { name: 'task2', handler: async () => {} },
        ])
        .build()

      const state: WorkflowState = {
        id: 'wf-par',
        name: 'parallel-status-test',
        status: 'completed',
        input: {},
        data: {},
        currentStep: 2,
        history: [
          {
            name: 'task1',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            duration: 100,
            retries: 0,
          },
          {
            name: 'task2',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            duration: 200,
            retries: 0,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }

      const diagram = generator.generateFromState(workflow, state, {
        showStatus: true,
        showParallelGroups: true,
      })

      expect(diagram).toContain('subgraph ParallelGroup_parallel')
      expect(diagram).toContain('task1:::completed')
      expect(diagram).toContain('task2:::completed')
      expect(diagram).toContain('100ms')
      expect(diagram).toContain('200ms')
    })

    it('should handle neutral theme', () => {
      const workflow = createWorkflow('neutral-test')
        .input<{}>()
        .step('test', async () => {})
        .build()

      const diagram = generator.generateFromDefinition(workflow, { theme: 'neutral' })

      expect(diagram).toContain("%%{init: {'theme':'neutral'}}%%")
    })
  })
})
