# Rocket Pool Architecture Guide

`@gravito/launchpad` uses a unique "Rocket Pool" strategy to achieve sub-second deployments for Bun applications.

## 1. The Pre-warming Strategy

Unlike traditional CI/CD that builds a new Docker image for every push, Launchpad maintains a pool of "Pre-warmed" containers (Rockets).

- **Idle State**: A generic Bun container is running and ready.
- **Assignment**: When a deployment is triggered, an Idle rocket is assigned to the mission.
- **Injection**: The code payload is injected directly into the running container via `docker cp`.
- **Hot Swap**: The proxy routes traffic to the new rocket instantly.

## 2. Payload Injection (The Secret Sauce)

By skipping the `docker build` phase, we eliminate 90% of the deployment latency.

```typescript
// PayloadInjector.ts
async inject(rocket, mission) {
  // 1. Fetch code from git (shallow clone)
  await git.clone(mission.url, mission.commit);
  
  // 2. Direct injection into container
  await Shell.run`docker cp ${localPath} ${rocket.id}:/app`;
  
  // 3. Trigger Bun hot-reload or process restart
  await Shell.run`docker exec ${rocket.id} kill -USR2 1`;
}
```

## 3. Mission Control Logic

The `MissionControl` aggregate manages the lifecycle of a deployment mission from inception to completion.

- **Validation**: Verifies the repository and permissions via `Fortify`.
- **Scheduling**: Finds the best available rocket in the pool.
- **Telemetry**: Streams logs and status updates to the developer via `Ripple`.

## 4. Auto-Recycling & Refurbishment

Once a deployment is no longer needed (e.g., PR is closed), the rocket is "Refurbished".

1.  **Stop Process**: The running Bun process is killed.
2.  **Clean Filesystem**: The `/app` directory is wiped.
3.  **Reset Network**: Proxy rules are removed.
4.  **Return to Pool**: The rocket state becomes `Idle`.

## 5. Security & Isolation

Each rocket runs in its own Docker network namespace. Filesystem access is strictly limited to the `/app` directory.
