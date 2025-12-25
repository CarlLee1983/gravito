# Error Handling

When you start a new Gravito project, error and exception handling is already configured for you.

## The Exception Handler

All exceptions are handled by the core exception handler.

### Reporting Exceptions

When an exception occurs, Gravito automatically logs it. If you wish to customize reporting logic (e.g., sending to Sentry), you can use Hooks (see Advanced Documentation).

### Rendering Exceptions

Gravito converts exceptions into HTTP responses.

- **For API Requests**: Automatically converted to JSON format with an `error` field.
- **For Web Requests**: Attempts to render views located in the `src/views/errors` directory.

## HTTP Exceptions

Some exceptions describe HTTP error codes from the server. For example, this may be a "page not found" error (404), an "unauthorized" error (401) or even a developer generated 500 error.

You may throw these exceptions using helper methods anywhere in your application:

```typescript
// 404 Not Found
return c.notFound('User not found');

// 403 Forbidden
return c.forbidden();
```

## Custom HTTP Error Pages

Gravito makes it easy to display custom error pages for various HTTP status codes. For example, if you wish to customize the error page for 404 HTTP status codes, create a `src/views/errors/404.html`:

```html
<!-- src/views/errors/404.html -->
@extends('layouts/app')

@section('content')
  <h1>404 - Page Not Found</h1>
  <p>Sorry, the page you are looking for could not be found.</p>
@endsection
```

This view will be rendered when a 404 exception is thrown by the application. Default supported pages include `404.html` and `500.html`.
