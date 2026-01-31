import { describe, expect, it } from 'bun:test'
import { createWorkflow } from '../src/builder/WorkflowBuilder'

describe('WorkflowBuilder', () => {
  describe('data() method', () => {
    it('should allow defining custom data type', () => {
      const workflow = createWorkflow('typed-data-test')
        .input<{ value: number }>()
        .data<{ result: string; count: number }>()
        .step('process', async (ctx) => {
          ctx.data.result = `Value is ${ctx.input.value}`
          ctx.data.count = ctx.input.value * 2
        })
        .build()

      expect(workflow.name).toBe('typed-data-test')
      expect(workflow.steps).toHaveLength(1)
    })
  })

  describe('describe() method', () => {
    it('should return workflow descriptor with step metadata', () => {
      const builder = createWorkflow('test-workflow')
        .input<{}>()
        .step('step1', async () => {})
        .step('step2', async () => {}, { retries: 3, timeout: 5000 })
        .commit('step3', async () => {})
        .step('conditional', async () => {}, { when: () => true })

      const descriptor = builder.describe()

      expect(descriptor.name).toBe('test-workflow')
      expect(descriptor.steps).toHaveLength(4)

      expect(descriptor.steps[0]).toEqual({
        name: 'step1',
        commit: false,
        retries: undefined,
        timeout: undefined,
        hasCondition: false,
      })

      expect(descriptor.steps[1]).toEqual({
        name: 'step2',
        commit: false,
        retries: 3,
        timeout: 5000,
        hasCondition: false,
      })

      expect(descriptor.steps[2]).toEqual({
        name: 'step3',
        commit: true,
        retries: undefined,
        timeout: undefined,
        hasCondition: false,
      })

      expect(descriptor.steps[3]).toEqual({
        name: 'conditional',
        commit: false,
        retries: undefined,
        timeout: undefined,
        hasCondition: true,
      })
    })

    it('should return descriptor for empty workflow', () => {
      const builder = createWorkflow('empty-workflow').input<{}>()

      const descriptor = builder.describe()

      expect(descriptor.name).toBe('empty-workflow')
      expect(descriptor.steps).toEqual([])
    })

    it('should handle workflow with all step options', () => {
      const builder = createWorkflow('full-options')
        .input<{}>()
        .step('comprehensive', async () => {}, {
          retries: 5,
          timeout: 10000,
          when: (ctx) => Boolean(ctx.data.enabled),
        })

      const descriptor = builder.describe()

      expect(descriptor.steps[0]).toEqual({
        name: 'comprehensive',
        commit: false,
        retries: 5,
        timeout: 10000,
        hasCondition: true,
      })
    })
  })

  describe('validate() method', () => {
    it('should attach input validator', () => {
      interface CustomInput {
        email: string
        age: number
      }

      const isCustomInput = (input: unknown): input is CustomInput => {
        return (
          typeof input === 'object' &&
          input !== null &&
          'email' in input &&
          'age' in input &&
          typeof (input as any).email === 'string' &&
          typeof (input as any).age === 'number'
        )
      }

      const workflow = createWorkflow('validated-workflow')
        .input<CustomInput>()
        .validate(isCustomInput)
        .step('process', async (ctx) => {
          ctx.data.validated = true
        })
        .build()

      expect(workflow.name).toBe('validated-workflow')
      expect(workflow.validateInput).toBeDefined()
      expect(workflow.validateInput?.({ email: 'test@example.com', age: 25 })).toBe(true)
      expect(workflow.validateInput?.({ invalid: 'data' })).toBe(false)
    })
  })
})
