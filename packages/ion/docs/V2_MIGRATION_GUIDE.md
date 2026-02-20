# Inertia v2 Protocol Migration Guide

> A comprehensive guide for migrating from Inertia v1 to Inertia v2 in @gravito/ion (v4.0.0+)

## Overview

Inertia v2 introduces powerful new features for optimizing performance and improving developer experience:

- **Deferred Props**: Load expensive data after initial render
- **Merge Strategies**: Fine-grained control over partial reload behavior
- **Error Bags**: Organize validation errors by category
- **History Control**: Manage browser history behavior
- **CSRF Protection**: Built-in automatic CSRF token generation

## Migration Checklist

- [ ] Update @gravito/ion to v4.0.0 or later
- [ ] Review deferred prop opportunities
- [ ] Update form validation handling (error bags)
- [ ] Enable CSRF protection
- [ ] Test all partial reload scenarios
- [ ] Update frontend Inertia adapter to v2

## 1. Deferred Props (Optional Optimization)

### Problem
Expensive data (statistics, notifications, etc.) delays initial page render.

### v1 Solution (Inefficient)
```typescript
// All data loaded before render
inertia.render('Dashboard', {
  user: { id: 1 },
  stats: await fetchStats(),      // Blocks render!
  notifications: await fetchNotifications() // Blocks render!
});
```

### v2 Solution (Optimized)
```typescript
// Defer expensive data
inertia.render('Dashboard', {
  user: { id: 1 },
  stats: InertiaService.defer(() => fetchStats()),
  notifications: InertiaService.defer(() => fetchNotifications(), 'notifications')
});
```

**Benefits:**
- Initial page renders faster (user sees UI immediately)
- Deferred props load in background
- Grouped by category for semantic organization

## 2. Merge Strategies (Partial Reload Control)

### Problem
Default behavior replaces all props, even when you want to append or deeply merge.

### v1 Solution (No Merge Control)
```typescript
// Partial reload always replaces props
inertia.render('Products/List', {
  items: newItems  // Replaces existing items
});
```

### v2 Solution (Fine-Grained Control)
```typescript
// Prepend new items to existing list
inertia.render('Products/List', {
  items: InertiaService.prepend([newProduct])
});

// Deep merge filters with existing data
inertia.render('Products/List', {
  filters: InertiaService.deepMerge({ status: 'active' })
});

// Shallow merge config
inertia.render('Products/List', {
  config: InertiaService.merge({ sortBy: 'name' })
});
```

**Strategies:**
- `merge()`: Shallow merge (top-level keys)
- `deepMerge()`: Recursive merge (nested objects)
- `prepend()`: Add items to beginning of array

## 3. Error Bags (Form Validation)

### Problem
Multiple forms on same page = conflicting error messages.

### v1 Solution (Global Errors)
```typescript
// All errors in one bag
inertia.withErrors({
  email: 'Email is required',
  password: 'Password required'
});
```

### v2 Solution (Named Error Bags)
```typescript
// Multiple named bags
inertia
  .withErrors({
    email: 'Email is required',
    password: 'Password required'
  }, 'login') // Login form errors
  .withErrors({
    line_1: 'Invalid CSV format',
    line_2: 'Missing required column'
  }, 'import'); // Import form errors
```

**Benefits:**
- Support multiple forms with independent validation
- Errors organized by context
- Frontend can display relevant errors per form

## 4. CSRF Protection (Automatic)

### Setup (One-Time)
```typescript
const ion = new OrbitIon({
  csrf: {
    enabled: true,              // Enabled by default
    cookieName: 'XSRF-TOKEN'    // Axios-compatible
  }
});
```

### Frontend (Automatic)
```typescript
// Axios automatically reads XSRF-TOKEN cookie
// and injects it in X-XSRF-TOKEN header
import axios from 'axios';

axios.post('/api/data', { /* ... */ });
// Header automatically includes: X-XSRF-TOKEN: <token>
```

**Benefits:**
- No manual token handling
- Axios-compatible out of the box
- Secure SameSite=Lax cookies
- Production: Secure flag enabled

## 5. History Control (New)

### Encrypt History (Disable Back Button)
```typescript
// Prevent users from navigating back
inertia.encryptHistory(true).render('SecurePage');
```

**Use cases:**
- Multi-step wizards
- Sensitive operations
- Payment flows

### Clear History (Clear on Load)
```typescript
// Clear browser history after load
inertia.clearHistory().render('SuccessPage');
```

**Use cases:**
- After successful transactions
- Logout pages
- Session-sensitive pages

## 6. Smart Redirects (New)

### Automatic Protocol Detection
```typescript
if (!user) {
  return inertia.location('/login');
}

// For Inertia requests: Returns 409 Conflict with X-Inertia-Location
// For regular requests: Returns 302 Found with Location header
```

**Benefits:**
- Single method handles both request types
- Inertia requests get instant redirect without full page load
- Regular requests get standard HTTP redirect

## 7. Method Chaining (Fluent Interface)

### v2 Pattern
All methods return `this` for chaining:

```typescript
return await inertia
  .encryptHistory()
  .clearHistory()
  .withErrors({ email: 'Invalid' }, 'form')
  .render('SecurePage', props);
```

**Benefits:**
- Cleaner, more readable code
- Less repetition
- Semantic API

## Migration Path

### Phase 1: No Changes Required
Your existing code works as-is. Backward compatible.

```typescript
// This still works exactly the same
inertia.render('Dashboard', { user, stats });
inertia.share('auth', user);
inertia.withErrors(errors);
```

### Phase 2: Adopt Deferred Props (Performance)
Identify expensive queries:

```typescript
// Before
inertia.render('Dashboard', {
  user: user,
  stats: await statsService.getStats(user.id),  // 500ms query
  notifications: await notificationService.getAll(user.id) // 300ms query
});

// After
inertia.render('Dashboard', {
  user: user,
  stats: InertiaService.defer(
    () => statsService.getStats(user.id),
    'heavy'
  ),
  notifications: InertiaService.defer(
    () => notificationService.getAll(user.id),
    'notifications'
  )
});
// Initial render: ~50ms (just user data)
// Deferred data loads in background
```

### Phase 3: Use Merge Strategies (UX)
Improve partial reload behavior:

```typescript
// Search page with pagination/filtering
inertia.render('Products/Search', {
  items: InertiaService.prepend(newResults),
  filters: InertiaService.deepMerge(updatedFilters),
  pagination: InertiaService.merge({ page: nextPage })
});
```

### Phase 4: Error Bags (Forms)
Organize complex form validation:

```typescript
// Multi-form page
export const handleRegistration = async (ctx: Context) => {
  const inertia = ctx.get('inertia');

  try {
    await registerUser(ctx.body);
  } catch (error) {
    return inertia
      .withErrors(error.validationErrors, 'register')
      .render('Register', previousFormData);
  }
};
```

## Performance Impact

### Deferred Props Example
```
Without Deferred Props:
┌─────────────────────────────────────────┐
│ Fetch user data (50ms)                  │
│ Fetch stats (500ms) ← Blocks render     │
│ Fetch notifications (300ms) ← Blocks    │
│ Serialize & Send (50ms)                 │
│ Total: ~900ms                           │
│ User sees: Blank page for 900ms         │
└─────────────────────────────────────────┘

With Deferred Props:
┌─────────────────┐
│ Fetch user (50ms)│
│ Serialize (50ms) │
│ Send (50ms)      │
│ Total: ~150ms    │
│ User sees: Page in 150ms! ✨
├─────────────────┤
│ Background load stats (500ms)
│ Background load notifications (300ms)
└─────────────────┘
```

### Version Caching Example
```
Without Caching:
Every request calls version()
  - Git query: 10-50ms per request
  - Environment query: 2-5ms per request

With Caching (60s TTL):
First request: 10-50ms
Subsequent 59 requests: 0ms overhead

For 10,000 requests/min:
Without: 50ms × 10,000 = 500,000ms = 500 seconds
With: 50ms × 10 (one per 60s) = 500ms
Savings: 99.9%
```

## Debugging v2 Features

### Chrome DevTools
1. Network tab: Look for `X-Inertia: true` header
2. Response preview: Shows page JSON with new fields:
   - `deferredProps`: Which props are deferred
   - `mergeProps`: Which props should merge
   - `encryptHistory`: History setting
   - `clearHistory`: Clear history flag
   - `errorBags`: Organized validation errors

### Console Logging
```typescript
// Enable debug logging
const ion = new OrbitIon({
  logLevel: 'debug'  // See all Inertia operations
});
```

## Troubleshooting

### Issue: Deferred props not appearing
**Solution:** Frontend Inertia adapter must support deferred props (v2+)

### Issue: Merge not working in partial reload
**Solution:** Ensure X-Inertia header is present and X-Inertia-Partial-Component matches

### Issue: CSRF token not in request
**Solution:** Ensure non-httpOnly cookie is readable by frontend library (Axios checks XSRF-TOKEN cookie by default)

### Issue: Errors not showing per form
**Solution:** Use named error bags and ensure frontend Inertia adapter supports them

## Best Practices

1. **Use Deferred Props for:**
   - Database queries > 100ms
   - External API calls
   - Expensive computations
   - Non-critical data

2. **Use Error Bags for:**
   - Multi-form pages
   - Complex validation scenarios
   - Different validation contexts

3. **Use Merge Strategies for:**
   - Pagination/infinite scroll
   - Filter refinement
   - Progressive data loading

4. **Always Test:**
   - Deferred prop loading
   - Partial reload scenarios
   - Error bag organization
   - CSRF token generation

## See Also

- [Inertia.js v2 Documentation](https://inertiajs.com)
- [@gravito/ion API Reference](../README.md)
- [Performance Optimization Guide](./OPTIMIZATION_PLAN.md)
