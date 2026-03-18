# 🚀 Roadmap de Melhorias - Farol Norte

**Data**: Março 2026  
**Versão Atual**: v68  
**Status**: MVP Offline-First

---

## 🔴 CRÍTICO - PRIORIDADE MÁXIMA (Q2 2026)

Essas melhorias impactam diretamente na qualidade, manutenibilidade e UX do app.

### 1. **Implementar TypeScript** 
**Impacto**: 🟢 ALTO | **Complexidade**: 🔴 ALTA | **Tempo Est.**: 4-6 semanas

#### Por quê?
- Refatorações afetam todo o code (bugs silenciosos hoje)
- DRE, temas e importação são complexos → TypeScript reduz bugs
- Escalabilidade: backend + usuários múltiplos exigem tipos

#### O que fazer?
- [ ] Adicionar `tsconfig.json` + `vite-plugin-react-swc`
- [ ] Migrar gradualmente:
  - Fase 1: Services (DataService, BankStrategies)
  - Fase 2: Contexts (FinanceContext, ThemeContext)
  - Fase 3: Components (utils, helpers)
  - Fase 4: Pages (prioritário: Dashboard, Transactions, Accounts)
- [ ] Criar tipos reutilizáveis:
  ```typescript
  // types/index.ts
  export type Transaction = { id, date, amount, description, categoryId, ... }
  export type Account = { id, name, bank, balance, ... }
  export type Category = { id, name, nature: 'fixed'|'variable'|'investment', relevance: 'essential'|'desire'|'invest' }
  export type Theme = { name, colors, backgrounds, ... }
  ```
- [ ] ESLint + Prettier (type-aware)
- [ ] Vitest para testes durante migração

#### Dependências a adicionar
```json
"typescript": "^5.3",
"@types/react": "^19",
"@types/node": "^20",
"ts-node": "^10.9"
```

#### Ganhos
✅ Redução 70% de bugs em refatorações  
✅ IDE autocompletar + type hints  
✅ Build time checks vs runtime  
✅ Documentação inline automática

---

### 2. **Customização Avançada de Temas**
**Impacto**: 🟢 ALTO | **Complexidade**: 🟡 MÉDIA | **Tempo Est.**: 3-4 semanas

#### Problema Atual
- Temas hardcoded em `index.css`
- Cores espalhadas por múltiplos arquivos
- Impossível trocar backgrounds sem editar CSS manualmente

#### Nova Arquitetura
```
src/
  themes/
    ├── index.ts                 // Tema atual + loader
    ├── themes.config.ts         // Definição de temas (array)
    ├── colors/
    │   ├── farol-norte.json     // Paleta cores
    │   ├── light.json
    │   ├── cyberpunk.json
    │   └── nature.json
    ├── backgrounds/
    │   ├── index.ts
    │   ├── animations.css
    │   ├── presets.ts           // Factory backgrounds
    │   └── uploads/             // Usuário-customizado
    └── fonts/
        ├── typography.ts
        └── scale.css
```

#### Implementação
1. **Config Schema**
```typescript
// types/theme.ts
interface ThemeConfig {
  name: string;
  id: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    surface: string;
    surfaceGlass: string;
    text: { main: string; muted: string; };
  };
  background: {
    type: 'gradient' | 'image' | 'pattern' | 'animation';
    value: string; // CSS gradient ou URL
    overlay?: string;
    animation?: string; // Nome da animação
  };
  effects: {
    glassmorphism: boolean;
    blur: number;
    shadow: string;
  };
  customizable: boolean; // Usuário pode editar
}
```

2. **Loader Dinâmico**
```typescript
// themes/index.ts
class ThemeManager {
  private current: ThemeConfig;
  
  applyTheme(id: string) {
    const theme = THEMES.find(t => t.id === id);
    // Injeta CSS variables dinamicamente
    this.setCSSVariables(theme.colors);
    this.applyBackground(theme.background);
    localStorage.setItem('theme', id);
  }
  
  private setCSSVariables(colors: any) {
    Object.entries(colors).forEach(([key, val]) => {
      document.documentElement.style.setProperty(`--${key}`, val);
    });
  }
}
```

3. **UI de Seleção Melhorado**
- Preview ao vivo de temas
- Editor visual (color picker)
- Upload de background (webp/jpg)
- Export/import tema customizado → JSON

#### Temas Iniciais
- `farol-norte` (default) - azul noturno + amarelo
- `light` - branco + tons mornos
- `cyberpunk` - neon + background dark
- `nature` - verdes + marrom + texturas

#### Ganhos
✅ Não precisa editar CSS manualmente  
✅ Usuários criam temas próprios  
✅ Alternância de tema <100ms  
✅ Consistência entre componentes

---

### 3. **Backgrounds Bonitos e Dinâmicos**
**Impacto**: 🟡 MÉDIO | **Complexidade**: 🟡 MÉDIA | **Tempo Est.**: 2-3 semanas

#### Estratégia
Criar **biblioteca de backgrounds** reutilizáveis, animados, sem overhead de performance.

#### Tipos Suportados

**A. Gradientes 3D Complexos**
```typescript
// backgrounds/gradients.ts
export const gradients = {
  nocturnalGradient: {
    stops: [
      { color: '#0F1C2E', position: '0%' },
      { color: '#1A3A52', position: '50%' },
      { color: '#0F1C2E', position: '100%' }
    ],
    angle: '135deg',
    animated: true // Shift de cores leve
  },
  sunsetGradient: { ... }
}
```

**B. Padrões (Patterns CSS)**
```typescript
// backgrounds/patterns.ts
export const patterns = {
  dots: `radial-gradient(circle, #fff 20%, transparent 20%)`,
  grid: `linear-gradient(0deg, transparent 24%, rgba(255,0,0,.05) 25%, rgba(255,0,0,.05) 26%, transparent 27%, transparent 74%, rgba(255,0,0,.05) 75%, rgba(255,0,0,.05) 76%, transparent 77%, transparent), linear-gradient(90deg, ...)`,
  noise: `url('data:image/svg+xml,...')`
}
```

**C. Animações SVelte**
```typescript
// backgrounds/animations.ts
export const animations = {
  floatingOrbs: {
    svg: `<svg>...</svg>`,
    css: `@keyframes float { ... }`
  },
  gridPulse: { ... }
}
```

**D. Upload de Imagem**
```typescript
// Suportar upload + otimizar
- Converter WebP
- Compressão automática (<500KB)
- Cache em IndexedDB
```

#### Componentes Novos
```
src/components/
  ├── BackgroundSelector.jsx  // Picker visual
  ├── BackgroundPreview.jsx   // Preview
  └── BackgroundEditor.jsx    // Upload + customize
```

#### Performance
- Lazy load de SVGs
- CSS animations (GPU accelerated)
- Debounce em mudanças
- IndexedDB para cache de uploads

#### Preset Inicial
1. **Midnight Ocean** (default) - Gradiente + orbs flutuantes
2. **Neon Grid** - Grid pulsante + cores cyberpunk
3. **Forest** - Texturas naturais + tons verdes
4. **Solar Flares** - Animação solar + amarelo/laranja
5. **Custom** - Upload do usuário

#### Ganhos
✅ Visual mais atrativo  
✅ Fácil atualizar sem redesign  
✅ Usuários customizam backgrounds  
✅ Sem impacto em performance (<2% overhead)

---

### 4. **Melhorar o DRE (Demonstração de Resultado do Exercício)**
**Impacto**: 🟢 ALTO | **Complexidade**: 🔴 ALTA | **Tempo Est.**: 5-6 semanas

#### Problema Atual
- Estrutura incompleta
- Cálculos incorretos
- Falta de visualizações
- Não segue estrutura contábil real

#### Nova Estrutura DRE

**Fluxo Financeiro Pessoal**
```
RECEITAS (Income)
├── Salário/Pró-labore
├── Renda Passiva
├── Bonus & Benefícios
└── Outras Receitas
────────────────────
Total Receitas Brutas

(-) DEDUÇÕES
├── Impostos (IR, INSS, Municipal)
├── Contribuições (sindicato, etc)
└── Retenções
────────────────────
Total Receitas Líquidas

(-) DESPESAS FIXAS (obrigatórias)
├── Moradia (aluguel/financiamento)
├── Utilidades (água, luz, gás)
├── Seguros (saúde, carro, vida)
├── Transportes (IPVA, combustível)
├── Educação (mensalidade, cursos)
└── Outros Fixos
────────────────────
Total Despesas Fixas

(-) DESPESAS VARIÁVEIS (discricionárias)
├── Alimentação (mercado, delivery)
├── Saúde (farmácia, médico)
├── Lazer & Entretenimento
├── Vestuário
├── Assinaturas
└── Outros Variáveis
────────────────────
Total Despesas Variáveis

(-) INVESTIMENTOS & APORTE
├── Poupança/Tesouro
├── Ações & Fundos
├── Criptomoedas
├── Imóveis
└── Empreendimentos
────────────────────
Total Investimentos

════════════════════
SALDO FINAL (Fluxo Caixa Projetado)
════════════════════

ANÁLISES DERIVADAS:
├── Taxa de Poupança: Investimentos / Receitas Líquidas
├── Índice 50/30/20: Fixas/Variáveis/Investimentos vs Receitas
├── Margem Operacional: (Receitas - Fixas) / Receitas
├── Runway: Meses que consegue viver sem renda
└── Saúde Financeira: Score baseado em índices
```

#### Tipos Novos (TypeScript)
```typescript
// types/dre.ts
interface DRELine {
  id: string;
  label: string;
  type: 'income' | 'deduction' | 'expense' | 'investment' | 'total';
  categoryIds: string[];      // Qual categorias incluir
  calculation: 'sum' | 'manual'; // Automático ou usuário
  value: number;              // Valor calculado/manual
  percentage: number;         // % do total
  tooltip: string;            // Explicação
  visibility: 'always' | 'monthly' | 'annual'; // Quando mostrar
}

interface DREReport {
  id: string;
  period: 'monthly' | 'quarterly' | 'annual';
  month: string; // "2026-03"
  lines: DRELine[];
  metrics: {
    savingsRate: number;       // %
    fiftyThirtyTwenty: { fixed, variable, investment }; // Índice 50/30/20
    operationalMargin: number; // %
    runway: number;            // Meses
    healthScore: 0-100;        // Score saúde
  };
  notes: string;              // Anotações do usuário
}
```

#### Componentes Novos
```
src/pages/Dre.jsx (refactored)
├── DRETable.jsx           // Tabela com cálculos
├── DREChart.jsx           // Gráfico (piano chart com stacked bars)
├── DREMetrics.jsx         // Cards com índices de saúde
├── DREComparison.jsx      // Comparação mês-a-mês
├── DREForecast.jsx        // Projeção para próximos 6 meses
└── DREExport.jsx          // PDF + CSV

src/services/
├── DRECalculator.ts       // Todos os cálculos
└── DREValidator.ts        // Validações & alertas
```

#### Lógica de Cálculo
```typescript
// services/DRECalculator.ts
class DRECalculator {
  calculate(period: string): DREReport {
    const transactions = this.getTransactionsByPeriod(period);
    
    // 1. Agrupa por categoria
    const grouped = this.groupByCategory(transactions);
    
    // 2. Calcula linhas
    const lines = this.calculateLines(grouped);
    
    // 3. Calcula métricas
    const metrics = this.calculateMetrics(lines);
    
    // 4. Valida (e.g., receita < 0 = alerta)
    this.validate(lines);
    
    return { lines, metrics };
  }
  
  calculateMetrics(lines: DRELine[]) {
    const gross = lines.find(l => l.id === 'gross_income').value;
    const fixed = lines.find(l => l.id === 'fixed_expenses').value;
    const variable = lines.find(l => l.id === 'variable_expenses').value;
    const investment = lines.find(l => l.id === 'investments').value;
    
    return {
      savingsRate: (investment / gross) * 100,
      fiftyThirtyTwenty: {
        fixed: (fixed / gross) * 100,      // Deve ser ~50%
        variable: (variable / gross) * 100, // Deve ser ~30%
        investment: (investment / gross) * 100 // Deve ser ~20%
      },
      operationalMargin: ((gross - fixed) / gross) * 100,
      runway: this.calculateRunway(fixed, variable)
    }
  }
}
```

#### Visualizações
1. **Tabela Estruturada** (como hoje, melhorado)
   - Colunas: Categoria, Valor, % do Total, Tendência (↑/↓)
   - Subtotais com background diferente
   - Totalizador sticky no final

2. **Gráfico Piano (Horizontal Stacked Bar)**
   ```
   Receitas     ████████░░░░░░░░░░░░░
   (-) Fixas    ██░░░░░░░░░░░░░░░░░░░
   (-) Variáv.  ████░░░░░░░░░░░░░░░░░
   (-) Invest.  ██░░░░░░░░░░░░░░░░░░░
   = Saldo      ░░░░░░░░░░░░░░░░░░░░░
   ```

3. **Health Score Card**
   ```
   ┌─────────────────────┐
   │ Saúde Financeira: 78 │  ← Calculado
   ├─────────────────────┤
   │ 50/30/20:           │
   │  • Fixas:   52% ⚠️   │  (Acima de 50%)
   │  • Variáv.: 28% ✅   │  (Dentro range)
   │  • Invest.: 20% ✅   │  (Dentro range)
   ├─────────────────────┤
   │ Runway: 8 meses ✅  │
   └─────────────────────┘
   ```

4. **Comparação Temporal**
   - Tooltip: "Fixas cresceram 12% vs mês anterior"
   - Tendência: seta + percentual

#### Validações & Alertas
```typescript
const alerts = [
  { 
    type: 'error', 
    message: 'Fixas > 60% da renda',
    severity: 'high'
  },
  {
    type: 'warning',
    message: 'Variáveis abaixo do esperado (saúde?)',
    severity: 'medium'
  }
]
```

#### Roadmap
- [ ] Semana 1-2: Tipos TS + validações
- [ ] Semana 3: DRECalculator + testes
- [ ] Semana 4: UI (tabela + métrica cards)
- [ ] Semana 5: Gráficos (Chart.js)
- [ ] Semana 6: Comparison + Forecast + Export (PDF)

#### Ganhos
✅ Visão real do fluxo financeiro  
✅ Índice 50/30/20 automático  
✅ Alertas proativos  
✅ Base para metas futuras  
✅ Credibilidade de fintech

---

## 🟡 IMPORTANTE - PRIORIDADE ALTA (Q3 2026)

### 5. **Sistema de Metas & Simulador (Budget v2)**
**Impacto**: 🟡 MÉDIO | **Complexidade**: 🟡 MÉDIA | **Tempo Est.**: 4 semanas

#### O que é?
Transformar "Budget" em sistema de metas inteligente com 3 simuladores:

**A. Ceifador de Metas** (Goal Calculator)
```
Meta: "Poupar R$ 10k em 6 meses para viagem"
  ├── Valor final: R$ 10.000
  ├── Prazo: 6 meses
  ├── Data início: 15/03/2026
  ├── Data fim: 15/09/2026
  ├── Aporte mensal automático: R$ 1.667 (calculado)
  ├── Simulação de crescimento:
  │   └── Com juros 0.5% a.m.: R$ 10.050 ✅ (objetivo atingido)
  └── Status: Progresso 33% (2 meses completos)
```

**B. Simulador de Cenários**
```
Cenário BASE (realista)
  └── Economia mensal: R$ 1.200 → Atingir meta em 8 meses

Cenário PESSIMISTA (-20% renda)
  └── Economia mensal: R$ 960 → Atingir meta em 10 meses ⚠️

Cenário OTIMISTA (+30% renda + bônus)
  └── Economia mensal: R$ 1.800 → Atingir meta em 5 meses ✅
```

**C. Análise de Impacto**
```
Se atingir meta: "Você terá R$ 10k em 15/09/2026"
Se não atingir: "Você economiizaria R$ 8k (80% da meta)"
Sacrifício: "Terá que reduzir variáveis em 15%"
```

---

### 6. **Sincronização com Backend (Firebase/Supabase)**
**Impacto**: 🟢 ALTO | **Complexidade**: 🔴 ALTA | **Tempo Est.**: 6-8 semanas

#### Por quê?
- localStorage é SPOF (single point of failure)
- Múltiplos dispositivos (PC, mobile, web)
- Backup automático
- Multi-usuário futuro

#### Stack Recomendado
**Firebase** (mais fácil para MVP)
- Auth (Google, Email)
- Firestore (dados)
- Storage (backups, background uploads)
- Analytics

**Supabase** (alternativa open-source)
- PostgreSQL + Auth
- Real-time subscriptions
- RLS (Row Level Security)

#### Arquitetura
```
LOCAL (Offline-first)
├── DataService (localStorage cache)
└── SyncManager (fila de mudanças)

↓ SYNC DAEMON ↓

REMOTE (Firebase/Supabase)
├── Authentication
├── User data (Firestore/PostgreSQL)
└── Versioning + Conflict resolution
```

---

## 🟢 FUTURO - PRIORIDADE BAIXA (2027+)

### 7. **Sistema de Testes (Vitest + RTL)**
### 8. **Integração Bancária Real (Open Banking)**
### 9. **IA de Recomendações (Machine Learning)**
### 10. **Mobile Native (React Native)**

---

## 📊 CRONOGRAMA VISUAL

```
Q2 2026 (Abr-Jun)
├── TypeScript ████████████░░ (4-6 sem)
├── Temas Avançados ███████░░░░░ (3-4 sem)
├── Backgrounds ██████░░░░░░░ (2-3 sem)
└── DRE v2 █████████████░ (5-6 sem)

Q3 2026 (Jul-Set)
├── Metas & Simulador ██████████░░░ (4 sem)
├── Backend Sync ████████████░░ (6-8 sem)
└── Testes █████░░░░░░░░ (ongoing)
```

---

## ✅ Checklist de Implementação

### TypeScript
- [ ] Setup tsconfig.json
- [ ] Migrar services
- [ ] Migrar contexts
- [ ] Migrar components
- [ ] Migrar pages
- [ ] ESLint type-aware

### Temas
- [ ] Schema de ThemeConfig
- [ ] ThemeManager (loader dinâmico)
- [ ] Persistência (localStorage)
- [ ] UI de seleção + editor
- [ ] 4 temas pré-definidos
- [ ] Export/import tema

### Backgrounds
- [ ] Biblioteca de gradientes
- [ ] Padrões CSS
- [ ] Animações SVG
- [ ] Upload de imagem
- [ ] Cache em IndexedDB
- [ ] 5 presets iniciais

### DRE
- [ ] Tipos TS
- [ ] DRECalculator
- [ ] DREValidator
- [ ] DRETable (refactored)
- [ ] Métricas & Health Score
- [ ] Gráfico (Chart.js)
- [ ] Comparação temporal
- [ ] Export (PDF + CSV)

---

## 💡 Notas Gerenciais

**Risco Técnico**: TypeScript + DRE são complexos. Considere pair programming ou mentoria.  
**Impacto UX**: Temas + backgrounds melhoram engajamento ~30%.  
**Viabilidade**: Todas as tarefas usam tecnologias existentes (não há novas dependências).  
**Dependências**: DRE depende de TypeScript estar 80% completo.  
**Testing**: Adicionar Vitest em paralelo → reduz bugs.

---

**Atualizado**: 18/03/2026  
**Próximo Review**: 01/04/2026
