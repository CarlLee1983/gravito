# Security Policy for @gravito/atlas

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Architecture & Security Model

Atlas is designed with a "Secure by Default" philosophy, employing a multi-layered defense strategy against common database vulnerabilities.

### 1. Auto-Parameterization (SQL Injection Defense)
The Query Builder Kernel (`src/query/QueryBuilder.ts`) separates SQL structure from data values at the architectural level. 
*   **Mechanism:** All user inputs passed to methods like `where`, `insert`, `update`, and `find` are never interpolated directly into the SQL string.
*   **Implementation:** Inputs are pushed to a `bindings` array and replaced with driver-specific placeholders (`?` for MySQL/SQLite, `$1` for PostgreSQL) by the `Grammar` engine.
*   **Verification:**
    ```typescript
    // User Input
    User.where('name', "Robert'); DROP TABLE users; --")
    
    // Compiled SQL (PostgreSQL)
    // SELECT * FROM "users" WHERE "name" = $1
    // Bindings: ["Robert'); DROP TABLE users; --"]
    ```

### 2. Identifier Escaping
All table and column names are rigorously escaped using the specific dialect of the connected database.
*   **PostgreSQL/SQLite:** Wrapped in double quotes (`"column"`).
*   **MySQL/MariaDB:** Wrapped in backticks (`` `column` ``).
*   **Protection:** Prevents identifier injection attacks where malicious column names could alter query logic.

### 3. Smart Guard (Proxy-based Protection)
The Active Record `Model` implementation uses a JavaScript `Proxy` to intercept all property access.
*   **Strict Mode:** By default, Models throw a `ColumnNotFoundError` if you attempt to assign a property that does not exist in the defined schema (when using `SchemaRegistry`).
*   **Mass Assignment:** While Atlas allows mass assignment for developer convenience, the internal `DirtyTracker` ensures only explicitly modified fields are included in `UPDATE` statements, reducing the attack surface.

### 4. Memory Safety (DoS Prevention)
To prevent Denial of Service (DoS) attacks via memory exhaustion (e.g., loading 1 million rows into RAM), Atlas provides a native Cursor API.
*   **`Model.cursor(chunkSize)`**: Iterates through datasets using an async generator.
*   **Lazy Hydration**: Objects are instantiated only when the iterator consumes them and are garbage-collected immediately after.
*   **Result:** Heap usage remains constant regardless of dataset size (verified by Benchmark suite: ~24MB heap usage for 50k+ records).

## Reporting a Vulnerability

If you discover a security vulnerability within Atlas, please do **not** disclose it publicly.
*   **Email:** security@gravito.dev
*   **Response:** We aim to acknowledge receipt within 24 hours and provide a fix timeline within 48 hours.
