# Responses

Gravito provides several ways to create HTTP responses. Every method in your controller must return a `Response` object.

## Creating Responses

### JSON Responses

The `json` method will automatically set the `Content-Type` header to `application/json` and convert the given data into JSON:

```typescript
return c.json({
  name: 'Carl',
  state: 'Taiwan'
});
```

You may also specify an HTTP status code:

```typescript
return c.json({ error: 'Unauthorized' }, 401);
```

### HTML & Text Responses

```typescript
// Return HTML
return c.html('<h1>Hello World</h1>');

// Return plain text
return c.text('Hello World');
```

### Redirects

Redirect responses allow you to send the user to another URL:

```typescript
return c.redirect('/home');

// With a specific status code
return c.redirect('/login', 301);
```

## Other Response Types

### Stream Responses

For large files or real-time data, you may use streams:

```typescript
const stream = new ReadableStream({ /* ... */ });
return c.stream(stream);
```

### 404 & Other Error Helpers

```typescript
return c.notFound('Content not found');
return c.forbidden('Forbidden');
return c.unauthorized();
return c.badRequest('Bad Request');
```

## Response Headers

You may use the `header` method to set headers before returning the response:

```typescript
c.header('X-Custom-Header', 'Value');
c.header('Cache-Control', 'no-cache');

return c.json({ success: true });
```

## Setting Status Codes

```typescript
c.status(201);
return c.json({ message: 'Created' });
```
