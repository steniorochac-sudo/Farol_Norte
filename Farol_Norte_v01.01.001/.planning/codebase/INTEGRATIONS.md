# External Integrations

**Analysis Date:** 2026-04-05

## APIs & External Services

**None detected:**
- The application appears to run fully client-side using localStorage.

## Data Storage

**Databases:**
- LocalStorage ONLY (`src/services/DataService.ts`)
  - Client: Custom wrappers `db`, `accountsDb`, `cardsDb`, etc.

**File Storage:**
- Local filesystem only (File parsing via FileReader in `DataService.ts`)

**Caching:**
- Local variable caching in `src/services/DataService.ts` (`_transactionsCache`, etc.)

## Authentication & Identity

**Auth Provider:**
- None detected.

## Monitoring & Observability

**Error Tracking:**
- None detected (Console logging only)

**Logs:**
- Browser console

## CI/CD & Deployment

**Hosting:**
- Static Hosting (PWA configuration present in `vite.config.ts`)

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**
- None detected

**Secrets location:**
- Not applicable

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-04-05*
