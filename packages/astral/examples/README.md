# Astral Examples

This directory contains example implementations demonstrating various features of `@gravito/astral`.

## 📂 Contents

### 1. [Basic CRUD](./basic-crud)
A standard Create, Read, Update, Delete resource implementation.
- **Features**: Resource mapping, Path parameters, Request/Response schemas.
- **Key File**: `contracts.ts`

### 2. [Authentication](./authentication)
Demonstrates how to handle public and protected routes.
- **Features**: `security` schemes (BearerAuth), Login flow, Request examples.
- **Key File**: `contract.ts`

### 3. [Custom Errors](./custom-errors)
Shows how to define explicit error responses for your API.
- **Features**: Custom error schemas, Multiple error status codes (404, 403, 422, 500).
- **Key File**: `contract.ts`

## 🚀 How to Run

These examples are code snippets. To run them, you would typically import the contracts into your main application configuration:

```typescript
import { OrbitAstral } from '@gravito/astral';
import { UserContract } from './basic-crud/contracts';
import { AuthContract } from './authentication/contract';

const astral = OrbitAstral.configure({
  title: 'My Example API',
  contracts: [
    UserContract,
    AuthContract
  ],
  securitySchemes: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  }
});
```
