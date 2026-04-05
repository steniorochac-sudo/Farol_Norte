# Codebase Structure

**Analysis Date:** 2026-04-05

## Directory Layout

```
[project-root]/
├── src/          
│   ├── assets/        # Static assets (images, icons)
│   ├── components/    # Reusable UI components
│   ├── context/       # React Context providers
│   ├── pages/         # Page-level components (Routed views)
│   ├── services/      # Business logic and data persistence
│   │   └── parsers/   # Bank-specific file parsers
│   ├── types/         # TypeScript interfaces and types
│   ├── utils/         # Helper functions and formatters
│   ├── App.tsx        # Main application router
│   ├── main.tsx       # Entry point
│   ├── index.css      # Global styles
```

## Directory Purposes

**`src/services/`:**
- Purpose: External integrations and local database
- Key files: `DataService.ts`, `ImportTransactionService.ts`

**`src/pages/`:**
- Purpose: Main views
- Key files: `Dashboard.tsx`, `Transactions.tsx`, `Accounts.tsx`

**`src/context/`:**
- Purpose: Global state wrappers
- Key files: `FinanceContext.tsx`, `ThemeContext.tsx`

## Naming Conventions

**Files:**
- PascalCase for Components/Pages: `Dashboard.tsx`
- camelCase for Utilities/Services: `formatters.ts`
- PascalCase for Services: `DataService.ts`

## Where to Add New Code

**New Feature View:**
- Primary code: `src/pages/[Name].tsx`
- Update Router: `src/App.tsx`

**New Parser:**
- Implementation: `src/services/parsers/[Bank]Parser.ts`

**Global State:**
- Implementation: `src/context/`

---

*Structure analysis: 2026-04-05*
