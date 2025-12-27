# Spectrum Verification

This example verifies the functionality of the `@gravito/spectrum` debug dashboard plugin.

## Scope

The verification script covers the following features:

1.  **Plugin Installation**: Ensuring `SpectrumOrbit` installs correctly.
2.  **Data Capture**:
    -   **Requests**: Intercepting HTTP requests and measuring duration.
    -   **Logs**: Wrapping `core.logger` to capture logs.
    -   **Queries**: Hooking into `@gravito/atlas` to capture SQL queries.
3.  **Persistence**: Verifying `FileStorage` saves and reloads data across instances.
4.  **Actionability**: Testing the **Replay Request** API.
5.  **Real-time**: Verifying **SSE (Server-Sent Events)** connectivity and data push.

## Usage

Run the verification script:

```bash
bun run verify.ts
```

Or via package script:

```bash
bun run verify
```

## Expected Output

You should see a series of checks passing, ending with:

```
✅ Replay successful!
✅ Persistence verified!
✅ SSE Push verified!
--- Spectrum Tier 2 Verification Complete! ---
```
