# Troubleshooting Guide

This guide provides solutions for common issues encountered when using `@gravito/flux` and tips for debugging workflow execution.

## Common Issues

### Workflow Stuck in `suspended` State
**Reason**: A workflow enters the `suspended` state when it calls `Flux.wait(signalName)` and waits for an external signal. It remains in this state until the `engine.signal()` method is called with the matching signal name.
**Solution**:
- Verify that the signal name sent via `engine.signal(id, signalName)` exactly matches the name used in `Flux.wait()`.
- Check if the process responsible for sending the signal is executing correctly.
- Ensure the workflow ID being signaled is correct.

### Compensation Execution Failure
**Reason**: Compensation logic (rollback) may fail if the compensation handler itself throws an error or if the environment has changed since the original step was executed.
**Solution**:
- Ensure compensation handlers are idempotent and can be safely retried.
- Check the logs for `compensation error` to identify the specific failure in the rollback logic.
- Verify that the data required for compensation is still available in `ctx.data`.

### Storage Connection Issues
**Reason**: Flux may fail to save or load workflow state if the underlying storage (e.g., SQLite, PostgreSQL) is unavailable or misconfigured.
**Solution**:
- For `BunSQLiteStorage`, verify the database file path is writable.
- Ensure `engine.init()` has been called if your storage adapter requires initialization.
- Check for concurrent modification errors if multiple engine instances are accessing the same storage without proper locking.

### Workflow Definition Changed Error
**Reason**: This error occurs when trying to resume a workflow using a definition that has a different number of steps than the version stored in the database.
**Solution**:
- Avoid changing the sequence or number of steps in a workflow definition if there are active (pending/suspended) instances.
- For breaking changes, consider versioning your workflow names (e.g., `order-process-v2`).

## Debugging Tips

### Enabling Detailed Tracing
Flux provides a comprehensive tracing system. You can capture every step start, completion, retry, and error by providing a `traceSink` in the configuration.

```typescript
const engine = new FluxEngine({
  trace: {
    write: async (event) => {
      console.log(`[Flux Trace] ${event.type}: ${event.stepName || event.workflowName}`);
    }
  }
})
```

### Using WorkflowProfiler
The `WorkflowProfiler` (if available in your version) can analyze execution history to identify bottlenecks, high retry rates, and slow steps.

- Use `profiler.profile(history)` to get execution metrics.
- Use `profiler.recommend(history)` for automated optimization suggestions.

### Checking State Machine Transitions
If a workflow is behaving unexpectedly, check the `status` and `history` fields in the workflow state.

- Use `engine.get(workflowId)` to inspect the current state.
- Verify the `status` of each step in the `history` array to see exactly where the workflow stopped or failed.
- A status of `failed` in the history will include an `error` object with the failure message.

### Handling `FluxError`
Flux throws structured errors using the `FluxError` class. You can check the `code` property to programmatically handle different error scenarios.

```typescript
try {
  await engine.execute(flow, input);
} catch (error) {
  if (error instanceof FluxError) {
    console.error(`Error Code: ${error.code}`);
    console.error(`Context:`, error.context);
  }
}
```
