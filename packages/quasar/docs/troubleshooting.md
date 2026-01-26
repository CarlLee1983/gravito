# Troubleshooting

## Agent Connectivity Issues

### "Redis connection error"
- **Cause**: Quasar cannot connect to the Transport Redis or Monitor Redis.
- **Solution**:
  - Verify Redis URL and credentials.
  - Check network connectivity/firewall.
  - Ensure Redis server is running.

### "Heartbeat failed"
- **Cause**: Agent failed to write heartbeat to Redis.
- **Solution**: Check Redis connection stability. Quasar uses adaptive heartbeat which backs off on failure.

## Metrics Issues

### Queues not showing up
- **Cause**: Probe not configured or Redis keys mismatch.
- **Solution**:
  - Verify `agent.monitorQueue('name', 'type')` matches your queue.
  - Check if queue actually has keys in Redis (e.g. `bull:name:wait`).
  - Ensure you are using the correct `monitor` Redis connection if it differs from transport.

### "Job events not appearing"
- **Cause**: Bridge not attached correctly or event names mismatch.
- **Solution**:
  - Ensure `agent.attachBridge(worker, type)` is called.
  - For Generic Bridge, verify `eventMapping`.
  - Check logs for `[LogBuffer] Failed to flush logs`.

## Performance Issues

### High Memory Usage
- **Cause**: Log buffer growing too large or high volume of logs.
- **Solution**:
  - Reduce `batchSize` or `flushInterval` in `BaseZenithBridge` (requires code modification currently or extending).
  - Check if logs are being sent successfully (backpressure).

### CPU Usage
- **Cause**: Frequent polling by Probes.
- **Solution**:
  - Increase `interval` in `QuasarAgent` options (default 10s).
