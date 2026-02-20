# @gravito/ion Architecture & Codemap

> Inertia.js v2 adapter for Gravito. Server-side protocol implementation for modern monoliths.

**Current Version:** 4.0.0
**Status:** Production Ready
**Test Coverage:** 41/41 tests passing (100%)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Application Controller               │
│                   (exports routes & actions)            │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│            InertiaHelper (InertiaService)              │
│  • render(component, props, rootVars, status)          │
│  • share(key, value) / shareAll(props)                │
│  • withErrors(errors, bag)                            │
│  • location(url) / encryptHistory() / clearHistory()  │
└────────┬──────────────────┬──────────────────┬─────────┘
         │                  │                  │
         ▼                  ▼                  ▼
    ┌─────────┐        ┌──────────┐      ┌──────────┐
    │ Render  │        │ Props    │      │ Errors & │
    │ Cycle   │        │ Resolution       │ History  │
    └─────────┘        └──────────┘      └──────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                 Serialization & Response                │
│          (JSON for Inertia / HTML for initial)         │
└──────────────┬─────────────────────────────────────────┘
               │
               ▼
    ┌─────────────────────┐
    │  HTTP Response      │
    │  (409/200/302)      │
    └─────────────────────┘
```

---

## 📁 Source File Organization

```
packages/ion/src/
├── types.ts                    # Type definitions (139 lines)
│   ├── DeferredPropDefinition<T>     # Lazy-loaded prop markers
│   ├── MergedPropDefinition<T>       # Merge operation markers
│   ├── ErrorBagDefinition             # Validation error organization
│   ├── InertiaPageObject              # Extended v2 page structure
│   └── PartialReloadMetadata          # Reset prop handling
│
├── InertiaService.ts          # Core service (556 lines)
│   ├── InertiaConfig Interface
│   │   ├── rootView: string             # Root HTML template name
│   │   ├── version: string | () => string | Promise<string>
│   │   ├── logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent'
│   │   ├── onRender: (metrics) => void  # Performance callback
│   │   └── ssr: { enabled, render }     # SSR configuration
│   │
│   ├── RenderMetrics Interface
│   │   ├── component: string
│   │   ├── duration: number
│   │   ├── isInertiaRequest: boolean
│   │   ├── propsCount: number
│   │   ├── timestamp: number
│   │   └── status?: number
│   │
│   ├── Static Factory Methods
│   │   ├── defer<T>(factory, group?)     # Deferred prop factory
│   │   ├── merge<T>(value, matchOn?)     # Shallow merge marker
│   │   ├── prepend<T>(value)              # Array prepend marker
│   │   └── deepMerge<T>(value)            # Deep merge marker
│   │
│   ├── Instance Methods
│   │   ├── render(component, props, rootVars, status)
│   │   │   └── Orchestrates entire render lifecycle
│   │   │       ├── detectInertiaRequest()
│   │   │       ├── validateVersion()
│   │   │       ├── resolveProps() [Enhanced v2]
│   │   │       ├── performSSR()
│   │   │       └── serializeResponse()
│   │   │
│   │   ├── share(key, value)     # Single prop sharing
│   │   ├── shareAll(props)       # Multiple props (immutable)
│   │   ├── getSharedProps()      # Retrieve shared state
│   │   ├── location(url)         # Smart redirect (409/302)
│   │   ├── encryptHistory()      # Disable back button
│   │   ├── clearHistory()        # Clear history after load
│   │   └── withErrors(errors, bag?) # Error bags
│   │
│   └── Internal Methods
│       ├── log(level, message, data)     # Structured logging
│       ├── escapeForSingleQuotedHtmlAttribute(value)
│       └── resolveProps(p) [NEW v2]
│           ├── Detects deferred props
│           ├── Detects merge props
│           ├── Handles X-Inertia-Reset
│           └── Returns { resolved, deferredGroups, mergedKeys }
│
├── index.ts                   # Orbit definition & exports (297 lines)
│   ├── InertiaHelper Interface
│   │   ├── (component, props, rootVars, status) // Callable
│   │   ├── share, shareAll, getSharedProps
│   │   ├── location, encryptHistory, clearHistory, withErrors [NEW v2]
│   │   └── service: InertiaService  // Direct access
│   │
│   ├── OrbitIonOptions Interface
│   │   ├── version?: string | () => string | Promise<string>
│   │   ├── rootView?: string
│   │   ├── ssr?: { enabled, render }
│   │   └── csrf?: { enabled?, cookieName? } [NEW v2]
│   │
│   └── OrbitIon Class
│       └── install(core: PlanetCore)
│           ├── Setup version caching [NEW v2]
│           ├── Setup CSRF middleware [NEW v2]
│           └── Setup InertiaService middleware
│               ├── Create InertiaService instance
│               ├── Create inertiaProxy (callable interface)
│               └── Attach to context.set('inertia', proxy)
│
└── errors.ts                   # Error classes (71 lines)
    ├── InertiaError (base)
    │   ├── code: string
    │   ├── httpStatus: number
    │   └── details?: Record<string, any>
    │
    ├── InertiaConfigError      # Missing dependencies
    ├── InertiaDataError         # Serialization failures
    └── InertiaTemplateError     # Template render failures
```

---

## 🔄 Data Flow: Render Lifecycle

```
Request
   │
   ▼
Middleware: Create InertiaService
   │
   ▼
Controller: return inertia.render(component, props)
   │
   ┌─────────────────────────────────────┐
   │  Render Lifecycle                   │
   ├─────────────────────────────────────┤
   │ 1. Detect Request Type              │
   │    • Check X-Inertia header         │
   │                                      │
   │ 2. Validate Asset Version           │
   │    • Compare client vs server       │
   │    • Return 409 if mismatch         │
   │                                      │
   │ 3. Resolve Props [ENHANCED v2]      │
   │    • Merge shared + component props │
   │    • Extract deferred props         │
   │    • Detect merge props             │
   │    • Execute lazy prop functions    │
   │    • Handle X-Inertia-Reset         │
   │                                      │
   │ 4. Perform SSR (optional)           │
   │    • Call SSR render function       │
   │    • Generate head + body           │
   │                                      │
   │ 5. Serialize Response [NEW v2]      │
   │    • Create page object with:       │
   │      - component, props, url        │
   │      - deferredProps (if any)       │
   │      - mergeProps (if any)          │
   │      - encryptHistory flag          │
   │      - clearHistory flag            │
   │      - errorBags (if any)           │
   │                                      │
   │ 6. Generate Response                │
   │    • Inertia req: JSON response     │
   │    • Initial load: HTML with JSON   │
   │                                      │
   │ 7. Fire Performance Callback        │
   │    • onRender(RenderMetrics)        │
   └─────────────────────────────────────┘
   │
   ▼
Response
```

---

## 🔀 Props Resolution Flow (NEW in v2)

```
Input Props = { shared, component }
   │
   ▼
Check Headers
   • X-Inertia-Partial-Data (only list)
   • X-Inertia-Partial-Except (exclude list)
   • X-Inertia-Partial-Component (should match)
   • X-Inertia-Reset (reset keys)
   │
   ▼
For Each Prop
   │
   ├─ Is DeferredPropDefinition? ──Yes──┐
   │  No                                 │
   │   │                                 │
   │   ├─ Is MergedPropDefinition? ─Yes─┼─ Track in mergedKeys[]
   │   │  No                          │  │
   │   │   │                          │  │
   │   │   ├─ Is function? ────Yes────┼─ Execute & resolve
   │   │   │  No                    │  │
   │   │   │   │                    │  │
   │   │   │   └─ Is in reset list? ┼──┼─Yes─ Set to undefined
   │   │   │      No                │  │
   │   │   │       │                │  │
   │   │   │       └─ Keep value ───┤  │
   │   │   │                        │  │
   └───┴───┴─ Track in deferredGroups[]
               Add merged keys
               │
               ▼
          Output: {
            resolved: { /* final props */ },
            deferredGroups: { /* lazy props */ },
            mergedKeys: [ /* merge metadata */ ]
          }
```

---

## 🔐 CSRF Protection Flow (NEW in v2)

```
OrbitIon.install() [First Middleware]
   │
   ├─ If csrf.enabled (default: true)
   │  │
   │  └─ Create CSRF Middleware
   │     │
   │     ├─ Generate random UUID token
   │     ├─ Create Set-Cookie header
   │     │  • Name: csrfCookieName (default: XSRF-TOKEN)
   │     │  • Value: random UUID
   │     │  • Secure: true (production only)
   │     │  • SameSite: Lax
   │     │  • HttpOnly: false (so JS can read)
   │     │
   │     └─ Axios reads XSRF-TOKEN cookie
   │        └─ Injects X-XSRF-TOKEN header on POST/PUT/DELETE
   │
   └─ Inertia Middleware [Second Middleware]
      (continues with InertiaService setup)
```

---

## 🧪 Test Coverage

### Files
- `tests/index.test.ts` - 41 comprehensive tests

### Categories

| Category | Tests | Coverage |
|----------|-------|----------|
| Core Inertia | 11 | 100% |
| Error Handling | 8 | 100% |
| Inertia v2 Features | 16 | 100% |
| Performance | 2 | 100% |
| CSRF & DX | 4 | 100% |
| **Total** | **41** | **100%** |

### Key Test Scenarios
- ✅ JSON response for Inertia requests
- ✅ HTML response for initial load
- ✅ Shared props merging
- ✅ Lazy prop execution
- ✅ Partial reloads with filters
- ✅ SSR rendering
- ✅ Asset version validation (409 Conflict)
- ✅ Deferred props grouping
- ✅ Merge strategy detection
- ✅ Error bags (named & default)
- ✅ History encryption/clear flags
- ✅ CSRF token generation
- ✅ Dev mode error pages
- ✅ Production error safety

---

## 📊 Performance Characteristics

### Render Latency (Typical)
```
Props Resolution:     ~0.5-1ms
Serialization:        ~0.1-0.2ms
Response Generation:  ~0.2-0.5ms
─────────────────────────────
Total Overhead:       ~1-2ms (negligible)

Added by Deferred Props:
└─ Initial render:    Same latency (props excluded)
└─ Deferred load:     Background (non-blocking)
```

### Memory Usage
- Per-request: ~1-2 KB (InertiaService instance)
- Shared state: ~5-10 KB (cached shared props)
- Cache (version):   ~100 bytes (per unique version string)

### Caching
- **Version Cache**: 60s TTL (saves 10-50ms per request)
- **Props Cache**: Per-request LRU (no persistent cache)
- **Serialization**: Direct JSON.stringify (no cache)

---

## 🔌 Integration Points

### Requires
- **@gravito/core**: PlanetCore, Context, ViewService types
- **@gravito/photon**: GravitoContext for HTTP operations

### Provides
- **InertiaHelper**: Injected at `context.set('inertia', helper)`
- **InertiaService**: Direct access via `helper.service`
- **Error Classes**: Exported for client error handling

### Complements
- **@gravito/prism**: Root HTML template rendering (OrbitPrism)
- **Auth Modules**: Session data sharing
- **Event Bus**: Error/validation event publishing (optional)

---

## 🎯 Key Design Decisions

| Decision | Implementation | Rationale |
|----------|----------------|-----------|
| Deferred Props | Factory functions in page object | Lazy evaluation without blocking |
| Merge Strategies | Type markers on prop values | Non-invasive, frontend-aware |
| Error Bags | Named dictionary of errors | Multi-form support, scoped errors |
| Version Caching | 60s TTL with closure capture | Prevents repeated expensive calls |
| Immutable shareAll() | Spread operator pattern | Prevents accidental mutations |
| CSRF Disabled HttpOnly | Non-HttpOnly cookie | Axios can read & inject automatically |
| Dev Error Pages | HTML in dev, plain text in prod | Security: no stack trace leaks |
| Method Chaining | All methods return `this` | Fluent API, semantic code |

---

## 📚 Related Documentation

- [README.md](../README.md) - Feature overview & quick start
- [README.zh-TW.md](../README.zh-TW.md) - Traditional Chinese documentation
- [V2_MIGRATION_GUIDE.md](./V2_MIGRATION_GUIDE.md) - Migration from v1 to v2
- [CHANGELOG.md](../CHANGELOG.md) - Version history
- [OPTIMIZATION_PLAN.md](./OPTIMIZATION_PLAN.md) - Performance strategies

---

**Last Updated:** 2026-02-20
**Maintainer:** Carl Lee (@gravito/core team)
