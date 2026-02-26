# Administrative Cortex Guide

The **Administrative Cortex** is the enterprise management layer of the Gravito Galaxy. It consists of a unified SDK and a series of pluggable UI modules that allow for rapid development of back-office applications.

## 1. Core Components

- **`@gravito/admin-sdk`**: The TypeScript SDK used to build custom administration features and interact with back-office APIs.
- **`@gravito/admin-shell-react`**: The foundational React shell that hosts all other `admin-ui-*` modules.
- **`@gravito/admin-ui-*`**: Ready-to-use domain modules (Access, Catalog, Invoices, etc.) that can be mounted into the shell.

## 2. Shared Identity & Permissions

The Administrative Cortex is tightly integrated with `@gravito/fortify` and `@gravito/sentinel`. All administrative actions are governed by centralized RBAC/ABAC rules.

## 3. Communication via Beam

Admin modules use `@gravito/beam` to communicate with the business Satellites, ensuring that the back-office is always in sync with the core data.

## 4. Customizing the Cortex

Developers can extend the administrative interface by creating their own `admin-ui` satellites and registering them with the `admin-sdk`.
