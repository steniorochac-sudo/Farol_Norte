# Farol Norte

**Goal:** Migrar persistência local para Supabase SaaS (Multi-tenant, PostgreSQL e RLS).

As a developer, I want to transition the current offline SPA to a multi-tenant cloud application using Supabase, so that users can have their data safely stored in the cloud, isolated from other users via RLS, while maintaining the existing client-side logic as much as possible.

## Requirements

### Validated

- ✓ Client-Side Single Page Application (SPA) - React + Vite
- ✓ PWA Enabled
- ✓ Transaction Import Flow (CSV/PDF parsing via papaparse and pdfjs-dist)
- ✓ Global State Management via FinanceContext

### Active

- [ ] **AUTH-01:** Implement Supabase Auth (Email/Senha)
- [ ] **AUTH-02:** Build Authentication Screens (Login, Cadastro, Recuperação de Senha)
- [ ] **DB-01:** Implement PostgreSQL RLS (Row Level Security) policies for multi-tenancy based on `auth.uid()`
- [ ] **MIG-01:** Refactor `DataService.ts` to use async Supabase API instead of localStorage (for transactions, accounts, cards)
- [ ] **MIG-02:** Onboarding Sync: Upsert existing local data to Supabase upon account creation/first login, and clear local DB on success.

### Out of Scope

- [ ] Redesign completo do Frontend (vamos reutilizar os componentes React atuais e o Bootstrap)
- [ ] Outros métodos de Auth (OAuth, SSO) neste primeiro momento.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Frontend "Cego" | Manter a regra multi-tenant apenas no RLS do PostgreSQL | Menos código no client-side e maior segurança |
| Sincronização Única | Dados locais migram no Onboarding e depois apagam do LocalStorage | Transição suave para Freemium -> SaaS sem dor de cabeça de merge de dados constante. |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
---
*Last updated: 2026-04-12 after initialization*
