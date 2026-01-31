import { describe, expect, test } from 'bun:test'
import {
  cannotRemoveRoot,
  cannotReplaceRoot,
  emptyWorkflow,
  FluxError,
  FluxErrorCode,
  invalidInput,
  invalidJsonPointer,
  invalidPathTraversal,
  invalidStateTransition,
  invalidStepIndex,
  noRecoveryAction,
  stepNotFound,
  workflowDefinitionChanged,
  workflowNameMismatch,
  workflowNotFound,
  workflowNotSuspended,
} from '../src/errors'

describe('FluxError', () => {
  test('creates error with message and code', () => {
    const error = new FluxError('Test error', FluxErrorCode.WORKFLOW_NOT_FOUND)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Test error')
    expect(error.code).toBe(FluxErrorCode.WORKFLOW_NOT_FOUND)
    expect(error.context).toBeUndefined()
  })

  test('creates error with context', () => {
    const context = { workflowId: 'wf-123', userId: 'user-456' }
    const error = new FluxError('Test error', FluxErrorCode.WORKFLOW_NOT_FOUND, context)
    expect(error.context).toEqual(context)
  })

  test('sets error name to FluxError', () => {
    const error = new FluxError('Test', FluxErrorCode.WORKFLOW_NOT_FOUND)
    expect(error.name).toBe('FluxError')
  })
})

describe('Error Factory Functions', () => {
  describe('workflowNotFound', () => {
    test('creates WORKFLOW_NOT_FOUND error', () => {
      const error = workflowNotFound('wf-123')
      expect(error).toBeInstanceOf(FluxError)
      expect(error.code).toBe(FluxErrorCode.WORKFLOW_NOT_FOUND)
      expect(error.message).toBe('Workflow not found: wf-123')
      expect(error.context).toEqual({ workflowId: 'wf-123' })
    })
  })

  describe('invalidStateTransition', () => {
    test('creates INVALID_STATE_TRANSITION error', () => {
      const error = invalidStateTransition('completed', 'running')
      expect(error).toBeInstanceOf(FluxError)
      expect(error.code).toBe(FluxErrorCode.INVALID_STATE_TRANSITION)
      expect(error.message).toBe('Invalid state transition: completed → running')
      expect(error.context).toEqual({ from: 'completed', to: 'running' })
    })
  })

  describe('invalidInput', () => {
    test('creates WORKFLOW_INVALID_INPUT error', () => {
      const error = invalidInput('order-workflow')
      expect(error).toBeInstanceOf(FluxError)
      expect(error.code).toBe(FluxErrorCode.WORKFLOW_INVALID_INPUT)
      expect(error.message).toBe('Invalid input for workflow "order-workflow"')
      expect(error.context).toEqual({ workflowName: 'order-workflow' })
    })
  })

  describe('workflowNameMismatch', () => {
    test('creates WORKFLOW_NAME_MISMATCH error', () => {
      const error = workflowNameMismatch('workflow-a', 'workflow-b')
      expect(error).toBeInstanceOf(FluxError)
      expect(error.code).toBe(FluxErrorCode.WORKFLOW_NAME_MISMATCH)
      expect(error.message).toBe('Workflow name mismatch: workflow-b !== workflow-a')
      expect(error.context).toEqual({ expected: 'workflow-a', received: 'workflow-b' })
    })
  })

  describe('workflowDefinitionChanged', () => {
    test('creates WORKFLOW_DEFINITION_CHANGED error', () => {
      const error = workflowDefinitionChanged()
      expect(error).toBeInstanceOf(FluxError)
      expect(error.code).toBe(FluxErrorCode.WORKFLOW_DEFINITION_CHANGED)
      expect(error.message).toBe('Workflow definition changed; operation is not safe')
      expect(error.context).toBeUndefined()
    })
  })

  describe('workflowNotSuspended', () => {
    test('creates WORKFLOW_NOT_SUSPENDED error', () => {
      const error = workflowNotSuspended('completed')
      expect(error).toBeInstanceOf(FluxError)
      expect(error.code).toBe(FluxErrorCode.WORKFLOW_NOT_SUSPENDED)
      expect(error.message).toBe('Workflow is not suspended (status: completed)')
      expect(error.context).toEqual({ status: 'completed' })
    })
  })

  describe('stepNotFound', () => {
    test('creates STEP_NOT_FOUND error with string step', () => {
      const error = stepNotFound('validate-input')
      expect(error).toBeInstanceOf(FluxError)
      expect(error.code).toBe(FluxErrorCode.STEP_NOT_FOUND)
      expect(error.message).toBe('Step not found: validate-input')
      expect(error.context).toEqual({ step: 'validate-input' })
    })

    test('creates STEP_NOT_FOUND error with number step', () => {
      const error = stepNotFound(5)
      expect(error).toBeInstanceOf(FluxError)
      expect(error.code).toBe(FluxErrorCode.STEP_NOT_FOUND)
      expect(error.message).toBe('Step not found: 5')
      expect(error.context).toEqual({ step: 5 })
    })
  })

  describe('invalidStepIndex', () => {
    test('creates INVALID_STEP_INDEX error', () => {
      const error = invalidStepIndex(10)
      expect(error).toBeInstanceOf(FluxError)
      expect(error.code).toBe(FluxErrorCode.INVALID_STEP_INDEX)
      expect(error.message).toBe('Invalid step index: 10')
      expect(error.context).toEqual({ index: 10 })
    })
  })

  describe('emptyWorkflow', () => {
    test('creates EMPTY_WORKFLOW error', () => {
      const error = emptyWorkflow('test-workflow')
      expect(error).toBeInstanceOf(FluxError)
      expect(error.code).toBe(FluxErrorCode.EMPTY_WORKFLOW)
      expect(error.message).toBe('Workflow "test-workflow" has no steps')
      expect(error.context).toEqual({ workflowName: 'test-workflow' })
    })
  })

  describe('noRecoveryAction', () => {
    test('creates NO_RECOVERY_ACTION error', () => {
      const error = noRecoveryAction('payment-step')
      expect(error).toBeInstanceOf(FluxError)
      expect(error.code).toBe(FluxErrorCode.NO_RECOVERY_ACTION)
      expect(error.message).toBe('No recovery action registered for step: payment-step')
      expect(error.context).toEqual({ stepName: 'payment-step' })
    })
  })

  describe('invalidJsonPointer', () => {
    test('creates INVALID_JSON_POINTER error', () => {
      const error = invalidJsonPointer('/invalid/path')
      expect(error).toBeInstanceOf(FluxError)
      expect(error.code).toBe(FluxErrorCode.INVALID_JSON_POINTER)
      expect(error.message).toBe('Invalid JSON Pointer: /invalid/path')
      expect(error.context).toEqual({ path: '/invalid/path' })
    })
  })

  describe('invalidPathTraversal', () => {
    test('creates INVALID_PATH_TRAVERSAL error', () => {
      const error = invalidPathTraversal('users', { data: { products: [] } })
      expect(error).toBeInstanceOf(FluxError)
      expect(error.code).toBe(FluxErrorCode.INVALID_PATH_TRAVERSAL)
      expect(error.message).toBe("Cannot access property 'users' on [object Object]")
      expect(error.context).toEqual({ segment: 'users', currentType: 'object' })
    })
  })

  describe('cannotReplaceRoot', () => {
    test('creates CANNOT_REPLACE_ROOT error', () => {
      const error = cannotReplaceRoot()
      expect(error).toBeInstanceOf(FluxError)
      expect(error.code).toBe(FluxErrorCode.CANNOT_REPLACE_ROOT)
      expect(error.message).toBe('Cannot replace root object')
      expect(error.context).toBeUndefined()
    })
  })

  describe('cannotRemoveRoot', () => {
    test('creates CANNOT_REMOVE_ROOT error', () => {
      const error = cannotRemoveRoot()
      expect(error).toBeInstanceOf(FluxError)
      expect(error.code).toBe(FluxErrorCode.CANNOT_REMOVE_ROOT)
      expect(error.message).toBe('Cannot remove root object')
      expect(error.context).toBeUndefined()
    })
  })
})

describe('FluxErrorCode', () => {
  test('has all required error codes', () => {
    expect(FluxErrorCode.WORKFLOW_NOT_FOUND).toBe(FluxErrorCode.WORKFLOW_NOT_FOUND)
    expect(FluxErrorCode.INVALID_STATE_TRANSITION).toBe(FluxErrorCode.INVALID_STATE_TRANSITION)
    expect(FluxErrorCode.WORKFLOW_INVALID_INPUT).toBe(FluxErrorCode.WORKFLOW_INVALID_INPUT)
    expect(FluxErrorCode.WORKFLOW_NAME_MISMATCH).toBe(FluxErrorCode.WORKFLOW_NAME_MISMATCH)
    expect(FluxErrorCode.WORKFLOW_DEFINITION_CHANGED).toBe(
      FluxErrorCode.WORKFLOW_DEFINITION_CHANGED
    )
    expect(FluxErrorCode.WORKFLOW_NOT_SUSPENDED).toBe(FluxErrorCode.WORKFLOW_NOT_SUSPENDED)
    expect(FluxErrorCode.STEP_NOT_FOUND).toBe(FluxErrorCode.STEP_NOT_FOUND)
    expect(FluxErrorCode.INVALID_STEP_INDEX).toBe(FluxErrorCode.INVALID_STEP_INDEX)
    expect(FluxErrorCode.EMPTY_WORKFLOW).toBe(FluxErrorCode.EMPTY_WORKFLOW)
    expect(FluxErrorCode.NO_RECOVERY_ACTION).toBe(FluxErrorCode.NO_RECOVERY_ACTION)
    expect(FluxErrorCode.INVALID_JSON_POINTER).toBe(FluxErrorCode.INVALID_JSON_POINTER)
    expect(FluxErrorCode.INVALID_PATH_TRAVERSAL).toBe(FluxErrorCode.INVALID_PATH_TRAVERSAL)
    expect(FluxErrorCode.CANNOT_REPLACE_ROOT).toBe(FluxErrorCode.CANNOT_REPLACE_ROOT)
    expect(FluxErrorCode.CANNOT_REMOVE_ROOT).toBe(FluxErrorCode.CANNOT_REMOVE_ROOT)
    expect(FluxErrorCode.CONCURRENT_MODIFICATION).toBe(FluxErrorCode.CONCURRENT_MODIFICATION)
    expect(FluxErrorCode.STEP_TIMEOUT).toBe(FluxErrorCode.STEP_TIMEOUT)
  })
})
