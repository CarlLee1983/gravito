# System Orchestration Guide

`@gravito/nova` allows the Galaxy to safely interact with the underlying host system. This guide covers how to execute commands and manage processes without compromising security.

## 1. Safety First: No Shell Injection

Nova uses template literals to ensure that any variable passed to a command is automatically escaped by the Bun runtime.

```typescript
// ❌ Dangerous (Standard child_process)
exec(`rm -rf ${userPath}`); // User could pass "; rm -rf /"

// ✅ Safe (Nova)
await Shell.run`rm -rf ${userPath}`; // Variable is strictly an argument
```

## 2. Command Pipelines

Chain multiple commands together efficiently.

```typescript
const output = await Shell.pipe(
  Shell.cmd`cat data.log`,
  Shell.cmd`grep "ERROR"`,
  Shell.cmd`wc -l`
).text();
```

## 3. Orchestration in Orbits

Orbits like `Horizon` (Scheduler) and `Launchpad` (Deployment) rely on Nova to manage system state.

- **Horizon**: Uses Nova to run scheduled shell scripts or system backups.
- **Launchpad**: Uses Nova to interact with the Docker CLI and manage container filesystems.

## 4. Performance: Zero-Copy Streams

When handling large command output, use the streaming API to avoid loading everything into memory.

```typescript
const proc = Shell.run`cat huge-dump.sql`.spawn();

for await (const chunk of proc.stdout) {
  await processChunk(chunk);
}
```

## 5. CWD and Environment Management

Isolate your commands to specific directories and provide strict environment variables.

```typescript
await Shell.run`npm install`
  .cwd('./satellites/my-domain')
  .env({ NODE_ENV: 'production' })
  .run();
```
