# Logging

To help you learn more about what's happening within your application, Gravito provides robust logging services. By default, Gravito uses `ConsoleLogger`, which is a best practice for containerized environments (Docker, Kubernetes).

## Writing Log Messages

You may write information to the logs using `c.logger` (in controllers) or `core.logger` (in global services).

```typescript
import { GravitoContext } from 'gravito-core';

export class UserController {
  async show(c: GravitoContext) {
    const id = c.req.param('id');
    
    c.logger.info(`Showing user profile for: ${id}`);
    
    try {
      // ...
    } catch (e) {
      c.logger.error('Failed to fetch user', e);
    }
  }
}
```

### Available Log Levels

Gravito supports several log levels:

```typescript
c.logger.debug('Debug message');
c.logger.info('General information');
c.logger.warn('Warning message');
c.logger.error('Error message');
```

## Contextual Information

The logger automatically includes timestamps and level tags. `ConsoleLogger` will format Error objects nicely, which is extremely helpful for debugging.
