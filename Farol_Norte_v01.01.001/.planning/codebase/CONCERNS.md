# Codebase Concerns

**Analysis Date:** 2026-04-05

## Tech Debt

**`DataService.ts` Complexity:**
- Issue: Centralized god-file for all persistence (500+ lines). Hand-rolled cache mechanism (`_transactionsCache` etc.)
- Files: `src/services/DataService.ts`
- Impact: Harder to test and maintain if schemas grow.
- Fix approach: Split into smaller db services or use a lightweight IndexedDB wrapper (e.g. Dexie) instead of heavy localStorage sync strings.

## Scaling Limits

**LocalStorage Capacity:**
- Current capacity: ~5MB limit in most browsers.
- Limit: Will break when transaction history becomes too large.
- Scaling path: Migrate from `localStorage` to `IndexedDB`.

## Fragile Areas

**State Synchronization:**
- Files: `src/context/FinanceContext.tsx`
- Why fragile: Relies on manual `refreshData()` calls after mutations in `DataService` to trigger re-renders. If a developer forgets to call `refreshData()`, UI goes out of sync.
- Safe modification: Adopt a reactive store (Zustand, Redux) or React Query where mutations automatically invalidate queries.

## Test Coverage Gaps

**Parsers:**
- What's not tested: CSV and PDF parsers (`NubankParser.ts`, etc.)
- Files: `src/services/parsers/*.ts`
- Risk: Changes in bank formats will break imports silently since there are no automated tests for regression.
- Priority: High

---

*Concerns audit: 2026-04-05*
