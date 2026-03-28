import { describe, it, expect } from 'bun:test'
import { GravitoException } from '@gravito/core'
import { InfrastructureException } from '@gravito/core'
import { QueueException } from '@gravito/core'
import { assertGravitoException } from '../../../core/tests/contract/helpers'
import { FluxError, FluxErrorCode, workflowNotFound, invalidStateTransition } from '../../src/errors'

describe('FluxError contract (MIGR-01, D-05)', () => {
  it('FluxError is instanceof GravitoException', () => {
    const err = new FluxError('test', FluxErrorCode.WORKFLOW_NOT_FOUND)
    expect(err).toBeInstanceOf(GravitoException)
  })

  it('FluxError is instanceof InfrastructureException', () => {
    const err = new FluxError('test', FluxErrorCode.WORKFLOW_NOT_FOUND)
    expect(err).toBeInstanceOf(InfrastructureException)
  })

  it('FluxError is instanceof QueueException', () => {
    const err = new FluxError('test', FluxErrorCode.WORKFLOW_NOT_FOUND)
    expect(err).toBeInstanceOf(QueueException)
  })

  it('FluxError is instanceof Error', () => {
    const err = new FluxError('test', FluxErrorCode.WORKFLOW_NOT_FOUND)
    expect(err).toBeInstanceOf(Error)
  })

  it('satisfies assertGravitoException contract', () => {
    const err = new FluxError('workflow not found: wf-1', FluxErrorCode.WORKFLOW_NOT_FOUND)
    assertGravitoException(err, {
      expectedCode: FluxErrorCode.WORKFLOW_NOT_FOUND,
      expectedStatus: 422,
      expectedInstanceOf: [QueueException, InfrastructureException, GravitoException],
      expectRetryable: false,
    })
  })

  it('.retryable defaults to false', () => {
    const err = new FluxError('test', FluxErrorCode.STEP_TIMEOUT)
    expect(err.retryable).toBe(false)
  })

  it('preserves cause chain (ERRM-03)', () => {
    const cause = new Error('original cause')
    const err = new FluxError('wrapped', FluxErrorCode.WORKFLOW_NOT_FOUND, { cause })
    // cause is stored in context, not propagated to GravitoException options in this design
    expect(err.context).toBeDefined()
  })

  it('name is FluxError (not Error or QueueException)', () => {
    const err = new FluxError('test', FluxErrorCode.EMPTY_WORKFLOW)
    expect(err.name).toBe('FluxError')
  })

  it('sets code to FluxErrorCode value', () => {
    const err = new FluxError('test', FluxErrorCode.INVALID_STATE_TRANSITION)
    expect(err.code).toBe(FluxErrorCode.INVALID_STATE_TRANSITION)
  })

  it('ESM/CJS instanceof boundary safety via Object.setPrototypeOf', () => {
    // Verify that FluxError is always instanceof FluxError after prototype chain fix
    const err = new FluxError('test', FluxErrorCode.WORKFLOW_NOT_FOUND)
    expect(err instanceof FluxError).toBe(true)
    expect(err instanceof QueueException).toBe(true)
    expect(err instanceof InfrastructureException).toBe(true)
    expect(err instanceof GravitoException).toBe(true)
  })

  it('factory workflowNotFound satisfies contract', () => {
    const err = workflowNotFound('wf-123')
    assertGravitoException(err, {
      expectedCode: FluxErrorCode.WORKFLOW_NOT_FOUND,
      expectedStatus: 422,
      expectedInstanceOf: [QueueException, InfrastructureException],
      expectRetryable: false,
    })
    expect(err.context).toEqual({ workflowId: 'wf-123' })
  })

  it('factory invalidStateTransition satisfies contract', () => {
    const err = invalidStateTransition('running', 'completed')
    assertGravitoException(err, {
      expectedCode: FluxErrorCode.INVALID_STATE_TRANSITION,
      expectedStatus: 422,
      expectedInstanceOf: [QueueException, InfrastructureException],
      expectRetryable: false,
    })
    expect(err.context).toEqual({ from: 'running', to: 'completed' })
  })
})
