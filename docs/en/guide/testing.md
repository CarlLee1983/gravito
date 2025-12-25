# HTTP Testing

Gravito provides a robust, Laravel-inspired testing harness that allows you to simulate HTTP requests against your application and perform fluent assertions on the responses.

## Introduction

Testing is a first-class citizen in Gravito. Built on top of **Bun Test**, the `HttpTester` allows you to test your routes, controllers, and middleware without the overhead of real network calls.

## Making Requests

To get started, use the `createHttpTester` helper with your `PlanetCore` instance.

```typescript
import { createHttpTester } from '@gravito/core';
import { core } from './app'; // Your PlanetCore instance

const tester = createHttpTester(core);

it('renders the homepage', async () => {
  const response = await tester.get('/');
  
  await response.assertOk();
});
```

### Supported Methods

The tester supports all common HTTP methods:

*   `tester.get(uri, headers?)`
*   `tester.post(uri, data?, headers?)`
*   `tester.put(uri, data?, headers?)`
*   `tester.patch(uri, data?, headers?)`
*   `tester.delete(uri, data?, headers?)`

### Sending JSON Data

When passing an object to methods like `post`, Gravito automatically serializes it to JSON and sets the `Content-Type` header:

```typescript
const response = await tester.post('/api/users', {
  name: 'Carl Lee',
  email: 'carl@gravito.dev'
});
```

---

## Response Assertions

The `TestResponse` returned by the tester provides a fluent API for inspecting responses.

### Status Assertions

*   `assertStatus(code)`: Assert a specific status code.
*   `assertOk()`: Assert status is 200.
*   `assertCreated()`: Assert status is 201.
*   `assertNotFound()`: Assert status is 404.
*   `assertForbidden()`: Assert status is 403.
*   `assertUnauthorized()`: Assert status is 401.
*   `assertRedirect(uri?)`: Assert the response is a redirect (optionally to a specific URI).

### Content Assertions

*   `assertSee(value)`: Assert the response body contains the given string.
*   `assertDontSee(value)`: Assert the response body does not contain the given string.
*   `assertJson(data)`: Assert the JSON response contains the given fragment.
*   `assertExactJson(data)`: Assert the JSON response exactly matches the given data.
*   `assertJsonStructure(structure)`: Assert the JSON response has the expected structure (keys).

### Header Assertions

*   `assertHeader(key, value)`: Assert a header is present with the given value.
*   `assertHeaderMissing(key)`: Assert a header is not present.

---

## Example Test Case

```typescript
import { describe, it, beforeEach } from 'bun:test';
import { PlanetCore, createHttpTester } from '@gravito/core';

describe('User API', () => {
  let tester: any;

  beforeEach(async () => {
    const core = await PlanetCore.boot();
    tester = createHttpTester(core);
  });

  it('can create a user', async () => {
    const response = await tester.post('/api/users', { name: 'Carl' });

    await response
      .assertCreated()
      .assertJson({ created: true })
      .assertJsonStructure({ id: 0 });
  });
});
```
