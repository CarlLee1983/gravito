/**
 * Standard error codes for FluxEngine operations.
 *
 * Used to programmatically identify the cause of a `FluxError`.
 */
export enum FluxErrorCode {
  /** The requested workflow instance could not be found in storage. */
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  /** The input data provided to the workflow failed validation. */
  WORKFLOW_INVALID_INPUT = 'WORKFLOW_INVALID_INPUT',
  /** The workflow definition has changed since the instance was created, making it unsafe to resume. */
  WORKFLOW_DEFINITION_CHANGED = 'WORKFLOW_DEFINITION_CHANGED',
  /** The workflow name in the definition does not match the stored state. */
  WORKFLOW_NAME_MISMATCH = 'WORKFLOW_NAME_MISMATCH',
  /** An attempt was made to transition the workflow to an incompatible state. */
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  /** An operation requiring a suspended state was attempted on a workflow that is not suspended. */
  WORKFLOW_NOT_SUSPENDED = 'WORKFLOW_NOT_SUSPENDED',
  /** The requested step index is out of bounds for the current workflow definition. */
  INVALID_STEP_INDEX = 'INVALID_STEP_INDEX',
  /** A workflow step exceeded its configured execution time limit. */
  STEP_TIMEOUT = 'STEP_TIMEOUT',
  /** The requested step could not be found in the workflow definition. */
  STEP_NOT_FOUND = 'STEP_NOT_FOUND',
  /** Multiple concurrent attempts to modify the same workflow instance were detected. */
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
  /** A workflow definition must contain at least one step to be executable. */
  EMPTY_WORKFLOW = 'EMPTY_WORKFLOW',
  /** No recovery action is registered for a step that requires recovery. */
  NO_RECOVERY_ACTION = 'NO_RECOVERY_ACTION',
  /** An invalid JSON Pointer was provided for state manipulation. */
  INVALID_JSON_POINTER = 'INVALID_JSON_POINTER',
  /** Cannot access a property on a non-object value in the state tree. */
  INVALID_PATH_TRAVERSAL = 'INVALID_PATH_TRAVERSAL',
  /** Cannot replace the root object of the workflow state. */
  CANNOT_REPLACE_ROOT = 'CANNOT_REPLACE_ROOT',
  /** Cannot remove the root object of the workflow state. */
  CANNOT_REMOVE_ROOT = 'CANNOT_REMOVE_ROOT',
}

/**
 * Base class for all errors thrown by the FluxEngine.
 *
 * Includes a machine-readable error code and optional context for debugging.
 *
 * @example
 * ```typescript
 * try {
 *   await engine.execute(flow, input);
 * } catch (err) {
 *   if (err instanceof FluxError && err.code === FluxErrorCode.STEP_TIMEOUT) {
 *     console.error('Workflow timed out');
 *   }
 * }
 * ```
 */
export class FluxError extends Error {
  /**
   * Creates a new FluxError.
   *
   * @param message - Human-readable error description.
   * @param code - Machine-readable error code.
   * @param context - Additional metadata related to the error.
   */
  constructor(
    message: string,
    public readonly code: FluxErrorCode,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'FluxError'
  }
}

/**
 * Creates a FluxError for a missing workflow instance.
 *
 * @param id - The unique identifier of the missing workflow.
 * @returns A FluxError with the WORKFLOW_NOT_FOUND code.
 *
 * @example
 * ```typescript
 * throw workflowNotFound('wf-123');
 * ```
 */
export function workflowNotFound(id: string): FluxError {
  return new FluxError(`Workflow not found: ${id}`, FluxErrorCode.WORKFLOW_NOT_FOUND, {
    workflowId: id,
  })
}

/**
 * Creates a FluxError for an illegal state transition.
 *
 * @param from - The current state of the workflow.
 * @param to - The attempted target state.
 * @returns A FluxError with the INVALID_STATE_TRANSITION code.
 *
 * @example
 * ```typescript
 * throw invalidStateTransition('completed', 'running');
 * ```
 */
export function invalidStateTransition(from: string, to: string): FluxError {
  return new FluxError(
    `Invalid state transition: ${from} → ${to}`,
    FluxErrorCode.INVALID_STATE_TRANSITION,
    { from, to }
  )
}

/**
 * Creates a FluxError for invalid workflow input.
 *
 * @param workflowName - The name of the workflow definition.
 * @returns A FluxError with the WORKFLOW_INVALID_INPUT code.
 *
 * @example
 * ```typescript
 * throw invalidInput('order-process');
 * ```
 */
export function invalidInput(workflowName: string): FluxError {
  return new FluxError(
    `Invalid input for workflow "${workflowName}"`,
    FluxErrorCode.WORKFLOW_INVALID_INPUT,
    { workflowName }
  )
}

/**
 * Creates a FluxError for a workflow name mismatch.
 *
 * @param expected - The name expected by the definition.
 * @param received - The name found in the stored state.
 * @returns A FluxError with the WORKFLOW_NAME_MISMATCH code.
 */
export function workflowNameMismatch(expected: string, received: string): FluxError {
  return new FluxError(
    `Workflow name mismatch: ${received} !== ${expected}`,
    FluxErrorCode.WORKFLOW_NAME_MISMATCH,
    { expected, received }
  )
}

/**
 * Creates a FluxError when a workflow definition has changed incompatibly.
 *
 * @returns A FluxError with the WORKFLOW_DEFINITION_CHANGED code.
 */
export function workflowDefinitionChanged(): FluxError {
  return new FluxError(
    'Workflow definition changed; operation is not safe',
    FluxErrorCode.WORKFLOW_DEFINITION_CHANGED
  )
}

/**
 * Creates a FluxError when an operation requires a suspended workflow.
 *
 * @param status - The current status of the workflow.
 * @returns A FluxError with the WORKFLOW_NOT_SUSPENDED code.
 */
export function workflowNotSuspended(status: string): FluxError {
  return new FluxError(
    `Workflow is not suspended (status: ${status})`,
    FluxErrorCode.WORKFLOW_NOT_SUSPENDED,
    { status }
  )
}

/**
 * Creates a FluxError when a specific step cannot be found.
 *
 * @param step - The name or index of the missing step.
 * @returns A FluxError with the STEP_NOT_FOUND code.
 */
export function stepNotFound(step: string | number): FluxError {
  return new FluxError(`Step not found: ${step}`, FluxErrorCode.STEP_NOT_FOUND, { step })
}

/**
 * Creates a FluxError for an out-of-bounds step index.
 *
 * @param index - The invalid step index.
 * @returns A FluxError with the INVALID_STEP_INDEX code.
 */
export function invalidStepIndex(index: number): FluxError {
  return new FluxError(`Invalid step index: ${index}`, FluxErrorCode.INVALID_STEP_INDEX, { index })
}

/**
 * Creates a FluxError for an empty workflow (no steps defined).
 *
 * @param workflowName - The name of the workflow.
 * @returns A FluxError with the EMPTY_WORKFLOW code.
 */
export function emptyWorkflow(workflowName: string): FluxError {
  return new FluxError(`Workflow "${workflowName}" has no steps`, FluxErrorCode.EMPTY_WORKFLOW, {
    workflowName,
  })
}

/**
 * Creates a FluxError when no recovery action is registered for a step.
 *
 * @param stepName - The name of the step requiring recovery.
 * @returns A FluxError with the NO_RECOVERY_ACTION code.
 */
export function noRecoveryAction(stepName: string): FluxError {
  return new FluxError(
    `No recovery action registered for step: ${stepName}`,
    FluxErrorCode.NO_RECOVERY_ACTION,
    { stepName }
  )
}

/**
 * Creates a FluxError for invalid JSON Pointer syntax.
 *
 * @param path - The invalid JSON Pointer.
 * @returns A FluxError with the INVALID_JSON_POINTER code.
 */
export function invalidJsonPointer(path: string): FluxError {
  return new FluxError(`Invalid JSON Pointer: ${path}`, FluxErrorCode.INVALID_JSON_POINTER, {
    path,
  })
}

/**
 * Creates a FluxError when attempting to traverse a non-object value.
 *
 * @param segment - The property being accessed.
 * @param current - The current value type.
 * @returns A FluxError with the INVALID_PATH_TRAVERSAL code.
 */
export function invalidPathTraversal(segment: string, current: unknown): FluxError {
  return new FluxError(
    `Cannot access property '${segment}' on ${current}`,
    FluxErrorCode.INVALID_PATH_TRAVERSAL,
    { segment, currentType: typeof current }
  )
}

/**
 * Creates a FluxError when attempting to replace the root object.
 *
 * @returns A FluxError with the CANNOT_REPLACE_ROOT code.
 */
export function cannotReplaceRoot(): FluxError {
  return new FluxError('Cannot replace root object', FluxErrorCode.CANNOT_REPLACE_ROOT)
}

/**
 * Creates a FluxError when attempting to remove the root object.
 *
 * @returns A FluxError with the CANNOT_REMOVE_ROOT code.
 */
export function cannotRemoveRoot(): FluxError {
  return new FluxError('Cannot remove root object', FluxErrorCode.CANNOT_REMOVE_ROOT)
}
