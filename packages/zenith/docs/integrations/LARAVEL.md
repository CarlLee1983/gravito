# Laravel Integration Guide for Gravito Zenith

This guide outlines the architecture and implementation details for integrating Laravel applications with **Gravito Zenith**, enabling centralized monitoring, logging, and auditing for Laravel Queues.

## Architecture Overview

+----------------+       +--------------+       +----------------+
| Laravel App    |       | Redis Broker |       | Gravito Zenith |
| (Horizon/Queue)| ----> | (Shared)     | <---- | Control Plane  |
+----------------+       +--------------+       +----------------+
        |                       ^
        |                       | Redis Pub/Sub & Lists
        +--- [Zenith Connector] +

The **Zenith Connector** acts as a bridge, translating Laravel's internal queue events into the Zenith Protocol.

---

## 1. Protocol Specification

To be visible in Zenith, the Laravel connector must implement the following Redis interactions:

### Namespace
Default Prefix: `flux:` (configurable). Ensure this matches your Zenith configuration.

### A. Worker Heartbeat (Process Discovery)
The connector must run a background process (or scheduled command) to announce the worker's presence.

- **Key**: `flux_console:worker:<worker-id>`
- **TTL**: 60 seconds (refresh every 30s)
- **Format**:
```json
{
  "id": "laravel-worker-supervisor-1",
  "hostname": "app-server-01",
  "pid": 1234,
  "uptime": 3600,
  "queues": ["default", "emails"],
  "concurrency": 10,
  "memory": {
    "rss": "100MB",
    "heapTotal": "N/A",
    "heapUsed": "N/A"
  },
  "timestamp": "ISO-8601 String"
}
```

### B. Real-time Logs (Event Stream)
The connector listens to Laravel Queue events and publishes them to Zenith.

- **Channel**: `flux_console:logs`
- **Format**:
```json
{
  "level": "info",    // info | warn | error | success
  "message": "Processing Job: App\\Jobs\\SendWelcomeEmail",
  "workerId": "laravel-worker-supervisor-1",
  "queue": "emails",
  "timestamp": "ISO-8601 String",
  "jobId": "uuid-..."  // Optional, enables specific tracing
}
```

### C. Job Auditing (Time Travel)
(Optional) For "Time Travel Audit" features, the connector should write to the persistent store if configured, or rely on Zenith's Redis scanning if utilizing standard Flux queue structures. Since Laravel uses its own queue structure, **Real-time Logs** are the primary integration point for v1.

---

## 2. Implementation Blueprint (PHP)

This section provides the reference implementation for the `gravito/zenith-laravel` composer package.

### Service Provider: `ZenithServiceProvider.php`

This provider hooks into Laravel's Queue events.

```php
<?php

namespace Gravito\Zenith\Laravel;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;
use Illuminate\Queue\Events\JobProcessing;
use Illuminate\Queue\Events\JobProcessed;
use Illuminate\Queue\Events\JobFailed;

class ZenithServiceProvider extends ServiceProvider
{
    public function boot()
    {
        // 1. Job Started
        Queue::before(function (JobProcessing $event) {
            $this->publishLog('info', $event);
        });

        // 2. Job Success
        Queue::after(function (JobProcessed $event) {
             $this->publishLog('success', $event);
        });

        // 3. Job Failed
        Queue::failing(function (JobFailed $event) {
             $this->publishLog('error', $event, $event->exception->getMessage());
        });
    }

    protected function publishLog($level, $event, $extraMessage = '')
    {
        $payload = $event->job->payload();
        $jobName = $payload['displayName'] ?? 'Unknown Job';
        
        // Simplify Job Name (remove namespace for display)
        $shortName = class_basename($jobName);

        $message = match($level) {
            'info' => "Processing {$shortName}",
            'success' => "Completed {$shortName}",
            'error' => "Failed {$shortName}: {$extraMessage}",
        };

        $log = [
            'level' => $level,
            'message' => $message,
            'workerId' => gethostname() . '-' . getmypid(), // Simple ID generation
            'queue' => $event->job->getQueue(),
            'timestamp' => now()->toIso8601String(),
            'jobId' => $event->job->getJobId()
        ];

        // Fire and forget to Redis
        try {
            Redis::connection('zenith')->publish('flux_console:logs', json_encode($log));
        } catch (\Exception $e) {
            // Silently fail to not disrupt main application
        }
    }
}
```

### Heartbeat Command: `zenith:heartbeat`

This command should be run as a daemon (Supervisor) or scheduled every minute (less precise). For best results, run as a sidecar process.

```php
<?php

namespace Gravito\Zenith\Laravel\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Redis;

class ZenithHeartbeat extends Command
{
    protected $signature = 'zenith:heartbeat';
    protected $description = 'Send heartbeat to Gravito Zenith';

    public function handle()
    {
        $this->info('Starting Zenith Heartbeat...');

        while (true) {
            $workerId = gethostname() . '-' . getmypid();
            
            $payload = [
                'id' => $workerId,
                'hostname' => gethostname(),
                'pid' => getmypid(),
                'uptime' => 0, // Calculate real uptime if needed
                'queues' => config('queue.connections.redis.queue', ['default']),
                'memory' => [
                    'rss' => round(memory_get_usage() / 1024 / 1024, 2) . ' MB',
                    'heapUsed' => 'N/A',
                    'heapTotal' => 'N/A'
                ],
                'timestamp' => now()->toIso8601String()
            ];

            Redis::connection('zenith')->setex(
                "flux_console:worker:{$workerId}",
                30, // 30s TTL
                json_encode($payload)
            );

            sleep(5);
        }
    }
}
```

## 3. Configuration

Users will need to configure a dedicated Redis connection for Zenith in `config/database.php` to avoid prefix collisions if they modify their default Redis prefix.

```php
'redis' => [
    'zenith' => [
        'host' => env('ZENITH_REDIS_HOST', '127.0.0.1'),
        'password' => env('ZENITH_REDIS_PASSWORD', null),
        'port' => env('ZENITH_REDIS_PORT', '6379'),
        'database' => env('ZENITH_REDIS_DB', '0'),
        'prefix' => '', // Ensure no prefix or match Zenith's expectation
    ],
],
```
