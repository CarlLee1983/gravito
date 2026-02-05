import { describe, expect, it } from 'bun:test'
import { createWorkflow } from '../src/builder/WorkflowBuilder'
import type { WorkflowDefinition, WorkflowState } from '../src/types'
import { MermaidGenerator } from '../src/visualization/MermaidGenerator'

describe('MermaidGenerator Extended', () => {
  const generator = new MermaidGenerator()

  describe('generateFromDefinition - uncovered paths', () => {
    it('should show details with commit, retries, timeout, and condition', () => {
      const workflow: WorkflowDefinition = {
        name: 'detailed-workflow',
        steps: [
          {
            name: 'step1',
            handler: async () => {},
            commit: true,
            retries: 3,
            timeout: 5000,
            when: () => true,
          },
        ],
      }

      const diagram = generator.generateFromDefinition(workflow, { showDetails: true })

      expect(diagram).toContain('step1')
      // commit 步驟用方括號
      expect(diagram).toContain('[')
    })

    it('should disable parallel group rendering', () => {
      const workflow = createWorkflow('no-parallel-render')
        .input<{}>()
        .stepParallel([
          { name: 'p1', handler: async () => {} },
          { name: 'p2', handler: async () => {} },
        ])
        .build()

      const diagram = generator.generateFromDefinition(workflow, {
        showParallelGroups: false,
      })

      // 不應包含 subgraph
      expect(diagram).not.toContain('subgraph')
    })

    it('should handle workflow with no steps', () => {
      const workflow: WorkflowDefinition = {
        name: 'empty-workflow',
        steps: [],
      }

      const diagram = generator.generateFromDefinition(workflow)
      expect(diagram).toContain('Start([Start: empty-workflow])')
      expect(diagram).toContain('End([End])')
    })

    it('should handle parallel group with compensation', () => {
      const workflow: WorkflowDefinition = {
        name: 'parallel-comp',
        steps: [
          {
            name: 'book-flight',
            handler: async () => {},
            parallelGroup: 'booking',
            compensate: async () => {},
          },
          {
            name: 'book-hotel',
            handler: async () => {},
            parallelGroup: 'booking',
            commit: true,
          },
        ],
      }

      const diagram = generator.generateFromDefinition(workflow, {
        showDetails: true,
        showParallelGroups: true,
      })

      expect(diagram).toContain('subgraph')
      expect(diagram).toContain('book_flight')
      expect(diagram).toContain('book_hotel')
      expect(diagram).toContain('Compensate')
    })

    it('should handle the last step as conditional', () => {
      const workflow: WorkflowDefinition = {
        name: 'last-conditional',
        steps: [
          { name: 'step1', handler: async () => {} },
          {
            name: 'optional-final',
            handler: async () => {},
            when: () => true,
          },
        ],
      }

      const diagram = generator.generateFromDefinition(workflow, { showDetails: true })

      // 條件步驟的 "no" 路徑指向 End
      expect(diagram).toContain('Condition')
    })
  })

  describe('generateFromState - uncovered paths', () => {
    it('should show skipped step condition in state diagram', () => {
      const workflow: WorkflowDefinition = {
        name: 'skipped-test',
        steps: [
          {
            name: 'conditional-step',
            handler: async () => {},
            when: () => false,
          },
        ],
      }

      const state: WorkflowState = {
        id: 'wf-skip',
        name: 'skipped-test',
        status: 'completed',
        input: {},
        data: {},
        currentStep: 1,
        history: [
          {
            name: 'conditional-step',
            status: 'skipped',
            retries: 0,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }

      const diagram = generator.generateFromState(workflow, state, { showStatus: true })

      expect(diagram).toContain('SKIPPED')
      expect(diagram).toContain('skipped')
    })

    it('should show retries in step label', () => {
      const workflow: WorkflowDefinition = {
        name: 'retry-display',
        steps: [{ name: 'flaky-step', handler: async () => {} }],
      }

      const state: WorkflowState = {
        id: 'wf-retry',
        name: 'retry-display',
        status: 'completed',
        input: {},
        data: {},
        currentStep: 1,
        history: [
          {
            name: 'flaky-step',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            duration: 500,
            retries: 3,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }

      const diagram = generator.generateFromState(workflow, state, { showStatus: true })

      expect(diagram).toContain('Retries: 3')
    })

    it('should handle compensated parallel steps in state view', () => {
      const workflow: WorkflowDefinition = {
        name: 'parallel-comp-state',
        steps: [
          {
            name: 'task1',
            handler: async () => {},
            parallelGroup: 'group1',
            compensate: async () => {},
          },
          {
            name: 'task2',
            handler: async () => {},
            parallelGroup: 'group1',
          },
        ],
      }

      const state: WorkflowState = {
        id: 'wf-par-comp',
        name: 'parallel-comp-state',
        status: 'rolled_back',
        input: {},
        data: {},
        currentStep: 2,
        history: [
          {
            name: 'task1',
            status: 'compensated',
            startedAt: new Date(),
            compensatedAt: new Date(),
            retries: 0,
          },
          {
            name: 'task2',
            status: 'failed',
            startedAt: new Date(),
            error: 'Failed',
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

      expect(diagram).toContain('Compensated')
      expect(diagram).toContain('task1:::compensated')
      expect(diagram).toContain('task2:::failed')
    })

    it('should show compensated non-parallel step', () => {
      const workflow: WorkflowDefinition = {
        name: 'seq-comp',
        steps: [
          {
            name: 'reserve',
            handler: async () => {},
            compensate: async () => {},
          },
        ],
      }

      const state: WorkflowState = {
        id: 'wf-seq-comp',
        name: 'seq-comp',
        status: 'rolled_back',
        input: {},
        data: {},
        currentStep: 0,
        history: [
          {
            name: 'reserve',
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

      expect(diagram).toContain('reserve_comp')
      expect(diagram).toContain('Compensated')
      expect(diagram).toContain('rolled back')
    })

    it('should show suspended workflow end status', () => {
      const workflow: WorkflowDefinition = {
        name: 'suspend-end',
        steps: [{ name: 'wait', handler: async () => {} }],
      }

      const state: WorkflowState = {
        id: 'wf-sus',
        name: 'suspend-end',
        status: 'suspended',
        input: {},
        data: {},
        currentStep: 0,
        history: [
          {
            name: 'wait',
            status: 'suspended',
            startedAt: new Date(),
            retries: 0,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }

      const diagram = generator.generateFromState(workflow, state)
      expect(diagram).toContain('Suspended')
    })

    it('should show step details when no execution data and showDetails=true', () => {
      const workflow: WorkflowDefinition = {
        name: 'details-no-exec',
        steps: [
          {
            name: 'detailed-step',
            handler: async () => {},
            commit: true,
            retries: 2,
            timeout: 10000,
            when: () => true,
          },
        ],
      }

      const state: WorkflowState = {
        id: 'wf-det',
        name: 'details-no-exec',
        status: 'pending',
        input: {},
        data: {},
        currentStep: 0,
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }

      const diagram = generator.generateFromState(workflow, state, {
        showStatus: false,
        showDetails: true,
      })

      // 無執行紀錄但 showDetails=true，應顯示步驟元資料
      expect(diagram).toContain('detailed_step')
    })

    it('should handle running status class', () => {
      const workflow: WorkflowDefinition = {
        name: 'running-test',
        steps: [{ name: 'active', handler: async () => {} }],
      }

      const state: WorkflowState = {
        id: 'wf-run',
        name: 'running-test',
        status: 'running',
        input: {},
        data: {},
        currentStep: 0,
        history: [
          {
            name: 'active',
            status: 'running' as any,
            startedAt: new Date(),
            retries: 0,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }

      const diagram = generator.generateFromState(workflow, state, { showStatus: true })
      expect(diagram).toContain('active:::started')
    })

    it('should handle default (unknown) status', () => {
      const workflow: WorkflowDefinition = {
        name: 'unknown-status',
        steps: [{ name: 'step1', handler: async () => {} }],
      }

      const state: WorkflowState = {
        id: 'wf-unk',
        name: 'unknown-status',
        status: 'pending',
        input: {},
        data: {},
        currentStep: 0,
        history: [
          {
            name: 'step1',
            status: 'pending',
            retries: 0,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      }

      const diagram = generator.generateFromState(workflow, state, { showStatus: true })
      expect(diagram).toContain('step1:::pending')
    })
  })

  describe('private helper methods (tested via public API)', () => {
    it('sanitizeNodeId should handle special characters', () => {
      const workflow: WorkflowDefinition = {
        name: 'special-chars',
        steps: [
          { name: 'step with spaces', handler: async () => {} },
          { name: 'step/with/slashes', handler: async () => {} },
          { name: 'step#with#hashes', handler: async () => {} },
        ],
      }

      const diagram = generator.generateFromDefinition(workflow)

      expect(diagram).toContain('step_with_spaces')
      expect(diagram).toContain('step_with_slashes')
      expect(diagram).toContain('step_with_hashes')
    })

    it('getNextNodeId should return End for last step', () => {
      const workflow: WorkflowDefinition = {
        name: 'next-node',
        steps: [
          {
            name: 'first',
            handler: async () => {},
            when: () => true,
          },
        ],
      }

      const diagram = generator.generateFromDefinition(workflow, { showDetails: true })
      // 最後一步的條件 no 路徑應指向 End
      expect(diagram).toContain('End')
    })
  })
})
