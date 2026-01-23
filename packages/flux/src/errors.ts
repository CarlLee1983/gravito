export enum FluxErrorCode {
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  WORKFLOW_INVALID_INPUT = 'WORKFLOW_INVALID_INPUT',
  WORKFLOW_DEFINITION_CHANGED = 'WORKFLOW_DEFINITION_CHANGED',
  WORKFLOW_NAME_MISMATCH = 'WORKFLOW_NAME_MISMATCH',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  WORKFLOW_NOT_SUSPENDED = 'WORKFLOW_NOT_SUSPENDED',
  INVALID_STEP_INDEX = 'INVALID_STEP_INDEX',
  STEP_TIMEOUT = 'STEP_TIMEOUT',
  STEP_NOT_FOUND = 'STEP_NOT_FOUND',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
}

export class FluxError extends Error {
  constructor(
    message: string,
    public readonly code: FluxErrorCode,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'FluxError'
  }
}

export function workflowNotFound(id: string): FluxError {
  return new FluxError(`Workflow not found: ${id}`, FluxErrorCode.WORKFLOW_NOT_FOUND, {
    workflowId: id,
  })
}

export function invalidStateTransition(from: string, to: string): FluxError {
  return new FluxError(
    `Invalid state transition: ${from} → ${to}`,
    FluxErrorCode.INVALID_STATE_TRANSITION,
    { from, to }
  )
}

export function invalidInput(workflowName: string): FluxError {
  return new FluxError(
    `Invalid input for workflow "${workflowName}"`,
    FluxErrorCode.WORKFLOW_INVALID_INPUT,
    { workflowName }
  )
}

export function workflowNameMismatch(expected: string, received: string): FluxError {
  return new FluxError(
    `Workflow name mismatch: ${received} !== ${expected}`,
    FluxErrorCode.WORKFLOW_NAME_MISMATCH,
    { expected, received }
  )
}

export function workflowDefinitionChanged(): FluxError {
  return new FluxError(
    'Workflow definition changed; operation is not safe',
    FluxErrorCode.WORKFLOW_DEFINITION_CHANGED
  )
}

export function workflowNotSuspended(status: string): FluxError {
  return new FluxError(
    `Workflow is not suspended (status: ${status})`,
    FluxErrorCode.WORKFLOW_NOT_SUSPENDED,
    { status }
  )
}

export function stepNotFound(step: string | number): FluxError {
  return new FluxError(`Step not found: ${step}`, FluxErrorCode.STEP_NOT_FOUND, { step })
}

export function invalidStepIndex(index: number): FluxError {
  return new FluxError(`Invalid step index: ${index}`, FluxErrorCode.INVALID_STEP_INDEX, { index })
}
