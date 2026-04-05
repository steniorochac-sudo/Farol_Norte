# Coding Conventions

**Analysis Date:** 2026-04-05

## Naming Patterns

**Files:**
- PascalCase for React components (`CustomSelect.tsx`)
- PascalCase or camelCase for services (`DataService.ts`, `formatters.ts`)

**Functions:**
- camelCase (`exportarDados`, `limparSistemaCompleto`)

**Types:**
- PascalCase (`Transaction`, `Account`)

## Code Style

**Formatting & Linting:**
- Tool used: ESLint v9 (`eslint.config.js`, `eslint.config.ts`)
- Plugins: `@typescript-eslint/eslint-plugin`, `eslint-plugin-react-hooks`

## Import Organization

**Order:**
1. React core (`import React from 'react'`)
2. Contexts and Hooks
3. Types
4. Services/Utils

## Error Handling

**Patterns:**
- Try/Catch blocks around volatile browser APIs (e.g., `localStorage.getItem` and `JSON.parse`).
- Console fallbacks for silent failures.

## Logging

**Framework:** `console`
**Patterns:**
- `console.warn` and `console.error` for LocalStorage failures (`DataService.ts`).

## Function Design

**Size:** Mixed, some large service files (DataService is 500+ lines).
**Exports:** Named exports preferred for services (`export const db`, `export function exportarDados`).

---

*Convention analysis: 2026-04-05*
