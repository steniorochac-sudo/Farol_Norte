# Technology Stack

**Analysis Date:** 2026-04-05

## Languages

**Primary:**
- TypeScript 5.3.3 - Core application logic (`tsconfig.json`)
- React 19.2 - UI components (`package.json`)

**Secondary:**
- HTML/CSS - `index.html`, `src/index.css`

## Runtime

**Environment:**
- Node.js (Version unspecified, likely 18+)

**Package Manager:**
- NPM
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- React 19.2.0 - UI Framework
- react-router-dom 7.13.1 - Routing

**Testing:**
- Not detected

**Build/Dev:**
- Vite 7.3.1 - Bundler and Dev Server (`vite.config.ts`)
- vite-plugin-pwa 1.2.0 - PWA support
- TypeScript 5.3.3 - Type checking

## Key Dependencies

**Critical:**
- papaparse 5.5.3 - CSV parsing
- pdfjs-dist 5.5.207 - PDF parsing
- chart.js 4.5.1 - Charts and visualizations

**Infrastructure:**
- Bootstrap 5.3.8 - CSS Framework
- lucide-react 0.576.0 - Icons

## Configuration

**Environment:**
- Not explicitly configured via `.env` in repository

**Build:**
- `vite.config.ts`: Defines chunking (vendor, charts, pdf) and PWA manifest.

## Platform Requirements

**Development:**
- Node.js env with NPM

**Production:**
- Any static hosting (Vite build) + PWA capabilities

---

*Stack analysis: 2026-04-05*
