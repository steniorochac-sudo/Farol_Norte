# Architecture

**Analysis Date:** 2026-04-05

## Pattern Overview

**Overall:** Client-Side Single Page Application (SPA) with LocalStorage Persistence

**Key Characteristics:**
- Fully client-side (Zero backend)
- Data persistence via LocalStorage
- PWA enabled

## Layers

**UI Layer:**
- Purpose: Render views and components
- Location: `src/pages/` and `src/components/`
- Contains: React components
- Depends on: Context, Services

**State Management Layer:**
- Purpose: Share data across components
- Location: `src/context/`
- Contains: React Context providers (`FinanceContext.tsx`, `ThemeContext.tsx`)
- Depends on: Data Layer

**Data Layer:**
- Purpose: Manage persistence in LocalStorage
- Location: `src/services/DataService.ts`
- Contains: CRUD operations, Cache layers (e.g., `db`, `accountsDb`)
- Depends on: Browser LocalStorage

## Data Flow

**Transaction Import Flow:**
1. User uploads CSV/PDF in UI
2. Components call parsers (`src/services/parsers/`)
3. Parsers convert raw data to `Transaction[]`
4. Context is called to `refreshData()` fetching from `DataService.ts`

**State Management:**
- Global state managed via `FinanceContext` holding transactions, accounts, categories, and caching via `useMemo`.

## Key Abstractions

**Data Caching:**
- Purpose: Avoid redundant LocalStorage lookups
- Examples: `src/services/DataService.ts` (e.g. `_transactionsCache`)
- Pattern: In-memory variables invalidated on writes.

## Entry Points

**Main App:**
- Location: `src/main.tsx`
- Triggers: Browser load
- Responsibilities: Render root, wrap contexts, start React Router.

## Error Handling

**Strategy:** Console Warnings & Try-Catch
**Patterns:**
- Try-catch blocks around `JSON.parse` in `src/services/DataService.ts`

## Cross-Cutting Concerns

**Logging:** Console
**Validation:** Custom logic during parsing
**Authentication:** None

---

*Architecture analysis: 2026-04-05*
